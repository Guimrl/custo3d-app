import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ColorSwatch } from "../components/ColorSwatch";
import { EmptyState } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { FilterBar } from "../components/FilterBar";
import { PageHeader } from "../components/PageHeader";
import { Photo } from "../components/Photo";
import { RowActions } from "../components/RowActions";
import { matches, uniqueSorted, useFilters } from "../hooks/useFilters";
import { useResource } from "../hooks/useResource";
import { date, grams, hours, money, percent } from "../lib/format";
import type { PrintDoc } from "../lib/types";

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "year", label: "Este ano" },
];

const STATUS = [
  { value: "orcamento", label: "Orçamentos" },
  { value: "concluida", label: "Impressas" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Data mínima de um período (null = sem limite). */
const periodStart = (period: string): Date | null => {
  if (!period) {
    return null;
  }

  if (period === "year") {
    return new Date(new Date().getFullYear(), 0, 1);
  }

  return new Date(Date.now() - Number(period) * DAY_MS);
};

export const Prints = () => {
  const [filters, setFilters] = useFilters(
    { search: "", status: "", customer: "", period: "", filament: "" },
    "filtros-impressoes",
  );
  // O status a API já filtra; o resto é filtrado aqui.
  const { items, loading, error, reload } = useResource<PrintDoc>(
    `/prints${filters.status ? `?status=${filters.status}` : ""}`,
  );
  const { confirm, notify } = useFeedback();
  const navigate = useNavigate();

  const customers = uniqueSorted(items.map((print) => print.customer));
  const filamentLabels = uniqueSorted(
    items.flatMap((print) => print.filaments.map((filament) => filament.label)),
  );

  const visible = useMemo(() => {
    const since = periodStart(filters.period);

    return items.filter(
      (print) =>
        matches([print.name, print.customer, print.notes, ...print.filaments.map((filament) => filament.label)].join(" "), filters.search) &&
        (!filters.customer || print.customer === filters.customer) &&
        (!filters.filament || print.filaments.some((filament) => filament.label === filters.filament)) &&
        (!since || (print.createdAt !== undefined && new Date(print.createdAt) >= since)),
    );
  }, [items, filters]);

  const complete = async (print: PrintDoc) => {
    const confirmed = await confirm({
      title: `Marcar "${print.name}" como impressa?`,
      message: "O filamento e os materiais serão descontados do estoque.",
      confirmLabel: "Dar baixa",
    });

    if (!confirmed) {
      return;
    }

    const result = await api.post<PrintDoc>(`/prints/${print.id}/complete`);
    notify(
      result.warnings?.length ? result.warnings.join(" ") : "Estoque atualizado.",
      result.warnings?.length ? "warning" : "success",
    );
    await reload();
  };

  const remove = async (print: PrintDoc) => {
    const confirmed = await confirm({
      title: `Excluir "${print.name}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    const restoreStock =
      !print.stockDeducted ||
      (await confirm({
        title: "Devolver o material ao estoque?",
        message: "O filamento e os materiais desta impressão voltam para os carretéis e materiais.",
        confirmLabel: "Devolver",
        cancelLabel: "Não devolver",
      }));

    await api.delete(`/prints/${print.id}${restoreStock ? "" : "?restoreStock=false"}`);
    await reload();
  };

  /** Cópia como orçamento, aberta para editar (peças repetidas). */
  const duplicate = async (print: PrintDoc) => {
    const copy = await api.post<PrintDoc>("/prints", {
      ...print,
      id: undefined,
      name: `${print.name} (cópia)`,
      status: "orcamento",
    });
    navigate(`/calcular/${copy.id}`);
  };

  return (
    <>
      <PageHeader
        title="Impressões e orçamentos"
        subtitle="Orçamentos não mexem no estoque; ao marcar como impressa, o material é descontado."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/calcular">
            Nova
          </Button>
        }
      />

      <FilterBar
        search={filters.search}
        onSearch={(search) => setFilters({ search })}
        placeholder="Buscar peça, cliente, filamento…"
        selects={[
          { key: "status", label: "Status", value: filters.status, options: STATUS },
          { key: "customer", label: "Cliente", value: filters.customer, options: customers },
          { key: "period", label: "Período", value: filters.period, options: PERIODS },
          { key: "filament", label: "Filamento", value: filters.filament, options: filamentLabels },
        ]}
        onSelect={(key, value) => setFilters({ [key]: value })}
        onClear={() => setFilters(null)}
        count={visible.length}
        total={items.length}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !items.length && (
        <EmptyState>Nenhuma impressão {filters.status ? "com esse status" : "ainda"}.</EmptyState>
      )}
      {!loading && items.length > 0 && !visible.length && <EmptyState>Nenhuma impressão com esses filtros.</EmptyState>}

      {visible.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Peça</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Filamento</TableCell>
                <TableCell align="right">Tempo</TableCell>
                <TableCell align="right">Qtd</TableCell>
                <TableCell align="right">Custo/peça</TableCell>
                <TableCell align="right">Venda/peça</TableCell>
                <TableCell align="right">Margem</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((print) => {
                const unitCost = print.result?.unitCost || 0;
                const salePrice = Number(print.salePrice) || 0;
                // Margem simples (sem taxa de venda), só para referência rápida.
                const margin = salePrice > 0 ? ((salePrice - unitCost) / salePrice) * 100 : null;
                const isDone = print.status === "concluida";

                return (
                  <TableRow key={print.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Photo url={print.photoUrl} alt={print.name} />
                        <Box>
                          <Link component={RouterLink} to={`/calcular/${print.id}`} underline="hover" sx={{ fontWeight: 500 }}>
                            {print.name}
                          </Link>
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                            {[print.customer, date(print.createdAt)].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={isDone ? "Impressa" : "Orçamento"}
                        color={isDone ? "success" : "default"}
                        variant={isDone ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        {print.filaments.map((filament, index) => (
                          <ColorSwatch key={index} item={filament} title={`${filament.label}: ${filament.grams} g`} />
                        ))}
                        <Typography variant="caption" sx={{ color: "text.secondary", pl: 0.5 }}>
                          {grams(print.result?.filamentGrams)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{hours(print.printHours)}</TableCell>
                    <TableCell align="right">{print.quantity}</TableCell>
                    <TableCell align="right">{money(unitCost)}</TableCell>
                    <TableCell align="right">{salePrice ? money(salePrice) : "—"}</TableCell>
                    <TableCell align="right" sx={{ color: margin !== null && margin < 0 ? "error.main" : undefined }}>
                      {margin === null ? "—" : percent(margin)}
                    </TableCell>
                    <TableCell align="right">
                      <RowActions
                        actions={[
                          ...(isDone ? [] : [{ label: "Imprimi! Dar baixa", icon: <CheckIcon fontSize="small" />, onClick: () => complete(print) }]),
                          { label: "Abrir", icon: <EditOutlinedIcon fontSize="small" />, onClick: () => navigate(`/calcular/${print.id}`) },
                          { label: "Duplicar", icon: <ContentCopyOutlinedIcon fontSize="small" />, onClick: () => duplicate(print) },
                          { label: "Excluir", icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => remove(print) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};
