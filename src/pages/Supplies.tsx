import AddIcon from "@mui/icons-material/Add";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryIcon from "@mui/icons-material/History";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { api } from "../api";
import { EmptyState, Section, StockBar } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { FilterBar } from "../components/FilterBar";
import { FormDialog, type FieldDef, type FormValues } from "../components/FormDialog";
import { PageHeader } from "../components/PageHeader";
import { Photo, PhotoField } from "../components/Photo";
import { RowActions } from "../components/RowActions";
import { matches, uniqueSorted, useFilters } from "../hooks/useFilters";
import { useResource } from "../hooks/useResource";
import { supplyUnitCost } from "../lib/calc";
import { date, decimal, money, today } from "../lib/format";
import type { SupplyDoc } from "../lib/types";

/** "Acabando": restam 10% ou menos do que foi comprado (mesmo critério do Painel). */
const isLowStock = (supply: SupplyDoc) =>
  supply.quantityPurchased > 0 &&
  supply.quantityRemaining / supply.quantityPurchased <= 0.1;

const UNITS = [
  { value: "un", label: "unidade" },
  { value: "par", label: "par" },
  { value: "g", label: "grama" },
  { value: "ml", label: "mililitro" },
  { value: "m", label: "metro" },
  { value: "cm", label: "centímetro" },
  { value: "folha", label: "folha" },
];

const DEFAULT_CATEGORIES = ["Chaveiros", "Ímãs", "Parafusos e insertos", "Pintura e acabamento", "Embalagem", "Eletrônica", "Cola"];

const fieldsFor = (categories: string[]): FieldDef[] => [
  { name: "name", label: "Nome", required: true, full: true, placeholder: "Ex.: Argola de chaveiro 25mm" },
  { name: "category", label: "Categoria", suggestions: categories, placeholder: "Ex.: Chaveiros" },
  { name: "unit", label: "Unidade", type: "select", options: UNITS },
  { name: "quantityPurchased", label: "Quantidade comprada", type: "number", required: true },
  { name: "pricePaid", label: "Valor pago (total)", type: "number", suffix: "R$", required: true },
  { name: "quantityRemaining", label: "Quantidade restante", type: "number", help: "Vazio = tudo o que comprou" },
  { name: "purchaseDate", label: "Data da compra", type: "date" },
  { name: "supplier", label: "Fornecedor", full: true },
  {
    name: "photoUrl",
    label: "Foto",
    full: true,
    render: (values, setValue) => (
      <PhotoField value={values.photoUrl} onChange={(url) => setValue("photoUrl", url)} />
    ),
  },
  { name: "notes", label: "Observações", type: "textarea", full: true },
];

const RESTOCK_FIELDS = (unit: string): FieldDef[] => [
  { name: "quantity", label: `Quantidade comprada (${unit})`, type: "number", required: true },
  { name: "price", label: "Valor pago", type: "number", suffix: "R$", required: true },
  { name: "date", label: "Data da compra", type: "date", required: true },
];

/** Compras do mais recente para o mais antigo. */
const purchasesOf = (supply: SupplyDoc) =>
  [...(supply.purchases ?? [])].sort((first, second) => second.date.localeCompare(first.date));

/** Histórico de compras de um material: cadastro e reposições. */
const PurchaseHistoryDialog = ({ supply, onClose }: { supply: SupplyDoc; onClose: () => void }) => {
  const purchases = purchasesOf(supply);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Compras: {supply.name}</DialogTitle>
      <DialogContent>
        {!purchases.length ? (
          <EmptyState>Nenhuma compra registrada.</EmptyState>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="right">Valor pago</TableCell>
                <TableCell align="right">Por {supply.unit}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((purchase, index) => (
                <TableRow key={`${purchase.date}-${index}`}>
                  <TableCell>{date(purchase.date)}</TableCell>
                  <TableCell align="right">
                    {decimal(purchase.quantity)} {supply.unit}
                  </TableCell>
                  <TableCell align="right">{money(purchase.price)}</TableCell>
                  <TableCell align="right">{purchase.quantity > 0 ? money(purchase.price / purchase.quantity) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
          Compras feitas antes do histórico existir aparecem somadas numa compra só, na data de cadastro.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export const Supplies = () => {
  const [filters, setFilters] = useFilters(
    { search: "", category: "", unit: "", low: false, archived: false },
    "filtros-materiais",
  );
  const { items, loading, error, reload } = useResource<SupplyDoc>(
    `/supplies${filters.archived ? "?all=true" : ""}`,
  );
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [restocking, setRestocking] = useState<SupplyDoc | null>(null);
  const [viewingHistory, setViewingHistory] = useState<SupplyDoc | null>(null);

  const categories = uniqueSorted([...DEFAULT_CATEGORIES, ...items.map((supply) => supply.category)]);

  const visible = useMemo(
    () =>
      items.filter(
        (supply) =>
          matches([supply.name, supply.category, supply.supplier, supply.notes].join(" "), filters.search) &&
          (!filters.category || (supply.category || "Geral") === filters.category) &&
          (!filters.unit || supply.unit === filters.unit) &&
          (!filters.low || isLowStock(supply)),
      ),
    [items, filters],
  );

  const groups = Object.entries(
    Object.groupBy(visible, (supply) => supply.category || "Geral"),
  );

  const save = async (values: FormValues) => {
    if (values.id) {
      await api.put(`/supplies/${values.id}`, values);
    } else {
      await api.post("/supplies", values);
    }
    await reload();
  };

  const toggleArchive = async (supply: SupplyDoc) => {
    await api.put(`/supplies/${supply.id}`, { archived: !supply.archived });
    await reload();
  };

  const remove = async (supply: SupplyDoc) => {
    const confirmed = await confirm({
      title: `Excluir "${supply.name}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });

    if (confirmed) {
      await api.delete(`/supplies/${supply.id}`);
      await reload();
    }
  };

  const restock = async (values: FormValues) => {
    await api.post(`/supplies/${restocking?.id}/restock`, values);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Outros materiais"
        subtitle="Argolas, ímãs, parafusos, tinta, embalagens… tudo que entra na peça além do filamento."
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing({ unit: "un", category: "", quantityPurchased: "", pricePaid: "", purchaseDate: today() })}
          >
            Novo material
          </Button>
        }
      />

      <FilterBar
        search={filters.search}
        onSearch={(search) => setFilters({ search })}
        placeholder="Buscar material, fornecedor…"
        selects={[
          { key: "category", label: "Categoria", value: filters.category, options: uniqueSorted(items.map((supply) => supply.category || "Geral")) },
          { key: "unit", label: "Unidade", value: filters.unit, options: UNITS.filter((unit) => items.some((supply) => supply.unit === unit.value)) },
        ]}
        onSelect={(key, value) => setFilters({ [key]: value })}
        extra={
          <>
            <Chip
              label="Acabando"
              color={filters.low ? "primary" : "default"}
              variant={filters.low ? "filled" : "outlined"}
              onClick={() => setFilters({ low: !filters.low })}
            />
            <Chip
              label="Arquivados"
              color={filters.archived ? "primary" : "default"}
              variant={filters.archived ? "filled" : "outlined"}
              onClick={() => setFilters({ archived: !filters.archived })}
            />
          </>
        }
        onClear={() => setFilters(null)}
        count={visible.length}
        total={items.length}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !items.length && (
        <EmptyState>Nenhum material cadastrado. Ex.: "Argola de chaveiro — 100 un por R$ 15,00".</EmptyState>
      )}
      {!loading && items.length > 0 && !visible.length && <EmptyState>Nenhum material com esses filtros.</EmptyState>}

      {groups.map(([category, list = []]) => (
        <Section key={category} title={category}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Custo unitário</TableCell>
                  <TableCell>Estoque</TableCell>
                  <TableCell align="right">Valor em estoque</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((supply) => {
                  const unitCost = supplyUnitCost(supply);

                  return (
                    <TableRow key={supply.id} sx={{ opacity: supply.archived ? 0.55 : 1 }}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Photo url={supply.photoUrl} alt={supply.name} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {supply.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {[
                                supply.supplier,
                                purchasesOf(supply)[0] && `Última compra ${date(purchasesOf(supply)[0].date)}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Typography>
                          </Box>
                          {supply.archived && <Chip label="arquivado" size="small" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {money(unitCost)} / {supply.unit}
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <StockBar value={supply.quantityRemaining} max={supply.quantityPurchased} />
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {decimal(supply.quantityRemaining)} de {decimal(supply.quantityPurchased)} {supply.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{money(unitCost * supply.quantityRemaining)}</TableCell>
                      <TableCell align="right">
                        <RowActions
                          actions={[
                            { label: "Repor", icon: <AddIcon fontSize="small" />, onClick: () => setRestocking(supply) },
                            { label: "Histórico de compras", icon: <HistoryIcon fontSize="small" />, onClick: () => setViewingHistory(supply) },
                            { label: "Editar", icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setEditing(supply) },
                            {
                              label: supply.archived ? "Reativar" : "Arquivar",
                              icon: supply.archived ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />,
                              onClick: () => toggleArchive(supply),
                            },
                            { label: "Excluir", icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => remove(supply) },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      ))}

      {editing && (
        <FormDialog
          title={editing.id ? "Editar material" : "Novo material"}
          fields={fieldsFor(categories)}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        >
          {(values) =>
            values.quantityPurchased > 0 && values.pricePaid > 0 ? (
              <Alert severity="info" icon={false} sx={{ mt: 2 }}>
                Custo por {values.unit}: <b>{money(values.pricePaid / values.quantityPurchased)}</b>
              </Alert>
            ) : null
          }
        </FormDialog>
      )}

      {restocking && (
        <FormDialog
          title={`Repor estoque: ${restocking.name}`}
          fields={RESTOCK_FIELDS(restocking.unit)}
          initial={{ quantity: "", price: "", date: today() }}
          onSubmit={restock}
          onClose={() => setRestocking(null)}
        >
          {() => (
            <Alert severity="info" icon={false} sx={{ mt: 2 }}>
              O custo unitário passa a ser a média ponderada de todas as compras.
            </Alert>
          )}
        </FormDialog>
      )}

      {viewingHistory && <PurchaseHistoryDialog supply={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </>
  );
};
