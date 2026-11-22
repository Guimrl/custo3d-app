import AddIcon from "@mui/icons-material/Add";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { ColorsField } from "../components/ColorsField";
import { colorsOf, ColorSwatch } from "../components/ColorSwatch";
import { EmptyState, FieldGrid, StockBar } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { FilterBar } from "../components/FilterBar";
import { finishName, FinishPicker, FinishTags, useFinishes } from "../components/Finishes";
import { FormDialog, type FieldDef, type FormValues } from "../components/FormDialog";
import { PageHeader } from "../components/PageHeader";
import { Photo, PhotoField } from "../components/Photo";
import { RowActions } from "../components/RowActions";
import { matches, uniqueSorted, useFilters } from "../hooks/useFilters";
import { useResource } from "../hooks/useResource";
import { spoolPricePerGram } from "../lib/calc";
import { date, grams, money, today } from "../lib/format";
import type { ColorMode, FinishDoc, Settings, SpoolDoc } from "../lib/types";

const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "Resina", "Outro"];

const fieldsFor = (finishes: FinishDoc[], materials: string[], brands: string[]): FieldDef[] => [
  // Lista padrão + materiais que já existem nos carretéis.
  { name: "material", label: "Material", type: "select", options: uniqueSorted([...MATERIALS, ...materials]) },
  { name: "brand", label: "Marca", suggestions: brands, placeholder: "Ex.: Voolt3D, 3D Fila…" },
  { name: "color", label: "Nome da cor", required: true, placeholder: "Ex.: Preto, Azul + Roxo" },
  {
    name: "colors",
    label: "Cores (amostra)",
    help: "Duo Color, Tri Color, Rainbow? Adicione cores e escolha faixas ou degradê.",
    render: (values, setValue) => (
      <ColorsField
        colors={colorsOf(values)}
        mode={(values.colorMode as ColorMode) || "solid"}
        onChange={(colors, mode) => {
          setValue("colors", colors);
          setValue("colorMode", mode);
        }}
      />
    ),
  },
  {
    name: "finishIds",
    label: "Acabamentos",
    full: true,
    render: (values, setValue) => (
      <FinishPicker
        finishes={finishes}
        value={values.finishIds ?? []}
        onChange={(ids) => setValue("finishIds", ids)}
      />
    ),
  },
  { name: "pricePaid", label: "Preço pago", type: "number", suffix: "R$", required: true },
  { name: "weightGrams", label: "Peso líquido", type: "number", suffix: "g", help: "Filamento que veio no carretel" },
  { name: "remainingGrams", label: "Quanto resta", type: "number", suffix: "g" },
  { name: "emptySpoolGrams", label: "Carretel vazio (tara)", type: "number", suffix: "g", help: "Para conferir pesando na balança" },
  { name: "diameter", label: "Diâmetro", type: "number", suffix: "mm" },
  { name: "purchaseDate", label: "Data da compra", type: "date" },
  { name: "supplier", label: "Onde comprou", full: true },
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

const blankSpool = (): FormValues => ({
  material: "PLA",
  color: "",
  colors: ["#3b82f6"],
  colorMode: "solid",
  finishIds: [],
  weightGrams: 1000,
  remainingGrams: 1000,
  emptySpoolGrams: 0,
  pricePaid: "",
  diameter: 1.75,
  purchaseDate: today(),
  photoUrl: "",
});

const WEIGH_FIELDS: FieldDef[] = [
  { name: "scaleGrams", label: "Peso na balança", type: "number", suffix: "g" },
  { name: "emptySpoolGrams", label: "Carretel vazio (tara)", type: "number", suffix: "g" },
  { name: "remainingGrams", label: "Ou informe o restante", type: "number", suffix: "g", full: true, help: "Usado só se a balança ficar vazia." },
];

/** Restante = balança − tara; sem balança, vale o restante digitado. */
const remainingFromScale = (values: FormValues): number | null =>
  values.scaleGrams === "" || values.scaleGrams == null
    ? null
    : Math.max(0, Number(values.scaleGrams) - (Number(values.emptySpoolGrams) || 0));

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right" }}>
      {value}
    </Typography>
  </Stack>
);

export const Spools = () => {
  const [filters, setFilters] = useFilters(
    { search: "", brand: "", material: "", color: "", finish: "", low: false, archived: false },
    "filtros-carreteis",
  );
  const { items, loading, error, reload } = useResource<SpoolDoc>(
    `/spools${filters.archived ? "?all=true" : ""}`,
  );
  const { items: finishes } = useFinishes();
  const { confirm } = useFeedback();
  const [lowStockGrams, setLowStockGrams] = useState(150);
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [weighing, setWeighing] = useState<SpoolDoc | null>(null);

  useEffect(() => {
    api
      .get<Settings>("/settings")
      .then((settings) => setLowStockGrams(settings.lowStockGrams ?? 150))
      .catch(() => undefined);
  }, []);

  const brands = uniqueSorted(items.map((spool) => spool.brand));
  const materials = uniqueSorted(items.map((spool) => spool.material));
  const colorNames = uniqueSorted(items.map((spool) => spool.color));

  const visible = useMemo(
    () =>
      items.filter((spool) => {
        const finishNames = (spool.finishIds ?? []).map((id) => finishName(finishes, id)).join(" ");

        return (
          matches([spool.material, spool.color, spool.brand, spool.supplier, spool.notes, finishNames].join(" "), filters.search) &&
          (!filters.brand || spool.brand === filters.brand) &&
          (!filters.material || spool.material === filters.material) &&
          (!filters.color || spool.color === filters.color) &&
          (!filters.finish || (spool.finishIds ?? []).includes(filters.finish)) &&
          (!filters.low || spool.remainingGrams <= lowStockGrams)
        );
      }),
    [items, finishes, filters, lowStockGrams],
  );

  const totalGrams = visible
    .filter((spool) => !spool.archived)
    .reduce((total, spool) => total + spool.remainingGrams, 0);

  const save = async (values: FormValues) => {
    if (values.id) {
      await api.put(`/spools/${values.id}`, values);
    } else {
      await api.post("/spools", values);
    }
    await reload();
  };

  const saveWeight = async (values: FormValues) => {
    await api.put(`/spools/${weighing?.id}`, {
      remainingGrams: remainingFromScale(values) ?? Number(values.remainingGrams),
      emptySpoolGrams: Number(values.emptySpoolGrams) || 0,
    });
    await reload();
  };

  const remove = async (spool: SpoolDoc) => {
    const confirmed = await confirm({
      title: `Excluir ${spool.material} ${spool.color}?`,
      message: "Impressões antigas mantêm o valor registrado.",
      confirmLabel: "Excluir",
      danger: true,
    });

    if (confirmed) {
      await api.delete(`/spools/${spool.id}`);
      await reload();
    }
  };

  const toggleArchive = async (spool: SpoolDoc) => {
    await api.put(`/spools/${spool.id}`, { archived: !spool.archived });
    await reload();
  };

  /** "Comprei outro igual": abre como novo, cheio e comprado hoje. */
  const duplicate = (spool: SpoolDoc) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, archived: _archived, ...copy } = spool;
    setEditing({ ...copy, colors: colorsOf(spool), remainingGrams: spool.weightGrams, purchaseDate: today() });
  };

  const openEdit = (spool: SpoolDoc) =>
    setEditing({ ...spool, colors: colorsOf(spool), finishIds: spool.finishIds ?? [] });

  const filterChip = (key: "low" | "archived", label: string) => (
    <Chip
      label={label}
      color={filters[key] ? "primary" : "default"}
      variant={filters[key] ? "filled" : "outlined"}
      onClick={() => setFilters({ [key]: !filters[key] })}
    />
  );

  return (
    <>
      <PageHeader
        title="Carretéis"
        subtitle={`${visible.length} carretéis · ${grams(totalGrams)} em estoque`}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(blankSpool())}>
            Novo carretel
          </Button>
        }
      />

      <FilterBar
        search={filters.search}
        onSearch={(search) => setFilters({ search })}
        placeholder="Buscar cor, marca, material, acabamento…"
        selects={[
          { key: "brand", label: "Marca", value: filters.brand, options: brands },
          { key: "material", label: "Material", value: filters.material, options: materials },
          { key: "color", label: "Cor", value: filters.color, options: colorNames },
          { key: "finish", label: "Acabamento", value: filters.finish, options: finishes.map((finish) => ({ value: finish.id, label: finish.name })) },
        ]}
        onSelect={(key, value) => setFilters({ [key]: value })}
        extra={
          <>
            {filterChip("low", "Acabando")}
            {filterChip("archived", "Arquivados")}
          </>
        }
        onClear={() => setFilters(null)}
        count={visible.length}
        total={items.length}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !items.length && (
        <EmptyState>Nenhum carretel cadastrado ainda. Cadastre o primeiro para começar a calcular.</EmptyState>
      )}
      {!loading && items.length > 0 && !visible.length && <EmptyState>Nenhum carretel com esses filtros.</EmptyState>}

      <FieldGrid minWidth={260}>
        {visible.map((spool) => {
          const pricePerGram = spoolPricePerGram(spool);

          return (
            <Card key={spool.id} sx={{ display: "flex", flexDirection: "column", opacity: spool.archived ? 0.55 : 1 }}>
              <ColorSwatch item={spool} shape="bar" />
              <Photo url={spool.photoUrl} alt={`${spool.material} ${spool.color}`} cover />
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <ColorSwatch item={spool} size={14} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                    {spool.material} · {spool.color}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {[spool.brand, spool.diameter && `${spool.diameter} mm`].filter(Boolean).join(" · ")}
                </Typography>
                <Box sx={{ my: 1 }}>
                  <FinishTags finishes={finishes} ids={spool.finishIds} />
                </Box>
                <StockBar value={spool.remainingGrams} max={spool.weightGrams} color={colorsOf(spool)[0]} />
                <InfoRow label="Resta" value={`${grams(spool.remainingGrams)} de ${grams(spool.weightGrams)}`} />
                <InfoRow label="Pago" value={`${money(spool.pricePaid)} · ${money(pricePerGram * 1000)}/kg`} />
                <InfoRow label="Valor restante" value={money(pricePerGram * spool.remainingGrams)} />
                <InfoRow label="Compra" value={date(spool.purchaseDate)} />
              </CardContent>
              <CardActions sx={{ justifyContent: "space-between", borderTop: 1, borderColor: "divider" }}>
                <Button size="small" startIcon={<ScaleOutlinedIcon />} onClick={() => setWeighing(spool)}>
                  Pesar
                </Button>
                <RowActions
                  actions={[
                    { label: "Editar", icon: <EditOutlinedIcon fontSize="small" />, onClick: () => openEdit(spool) },
                    { label: "Duplicar (comprei outro)", icon: <ContentCopyOutlinedIcon fontSize="small" />, onClick: () => duplicate(spool) },
                    {
                      label: spool.archived ? "Reativar" : "Arquivar",
                      icon: spool.archived ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />,
                      onClick: () => toggleArchive(spool),
                    },
                    { label: "Excluir", icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => remove(spool) },
                  ]}
                />
              </CardActions>
            </Card>
          );
        })}
      </FieldGrid>

      {editing && (
        <FormDialog
          title={editing.id ? "Editar carretel" : "Novo carretel"}
          fields={fieldsFor(finishes, materials, brands)}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}

      {weighing && (
        <FormDialog
          title={`Ajustar estoque: ${weighing.material} ${weighing.color}`}
          fields={WEIGH_FIELDS}
          initial={{ scaleGrams: "", emptySpoolGrams: weighing.emptySpoolGrams || 0, remainingGrams: weighing.remainingGrams }}
          onSubmit={saveWeight}
          onClose={() => setWeighing(null)}
        >
          {(values) => {
            const fromScale = remainingFromScale(values);

            return fromScale === null ? null : (
              <Alert severity="info" icon={false} sx={{ mt: 2 }}>
                Restante pela balança: <b>{grams(fromScale)}</b>
              </Alert>
            );
          }}
        </FormDialog>
      )}
    </>
  );
};
