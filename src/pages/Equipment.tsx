import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { EmptyState, Section } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { FilterBar } from "../components/FilterBar";
import { FormDialog, type FieldDef, type FormValues } from "../components/FormDialog";
import { PageHeader } from "../components/PageHeader";
import { Photo, PhotoField } from "../components/Photo";
import { RowActions } from "../components/RowActions";
import { matches, uniqueSorted, useFilters } from "../hooks/useFilters";
import { useResource } from "../hooks/useResource";
import { equipmentHourlyCost } from "../lib/calc";
import { money } from "../lib/format";
import type { EquipmentDoc, EquipmentType } from "../lib/types";

/** Só impressora tem "manutenção por hora". */
const fieldsFor = (type: EquipmentType): FieldDef[] => [
  {
    name: "name",
    label: "Nome / modelo",
    required: true,
    full: true,
    placeholder: type === "printer" ? "Ex.: Bambu Lab A1" : "Ex.: Sunlu S2",
  },
  { name: "brand", label: "Marca" },
  { name: "price", label: "Valor pago", type: "number", suffix: "R$", required: true },
  {
    name: "lifespanHours",
    label: "Vida útil estimada",
    type: "number",
    suffix: "h",
    help: "Em quantas horas de uso ela \"se paga\". Impressoras: 3.000–8.000 h.",
  },
  {
    name: "powerWatts",
    label: "Consumo médio",
    type: "number",
    suffix: "W",
    help: "Média real durante o uso, não a potência da fonte.",
  },
  ...(type === "printer"
    ? [{ name: "maintenancePerHour", label: "Manutenção", type: "number", suffix: "R$/h", help: "Bicos, correias, PEI… por hora." } satisfies FieldDef]
    : []),
  { name: "active", label: "Em uso", type: "switch" },
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

const blankFor = (type: EquipmentType): FormValues => ({
  type,
  name: "",
  price: "",
  lifespanHours: type === "printer" ? 5000 : 3000,
  powerWatts: type === "printer" ? 120 : 50,
  maintenancePerHour: 0,
  active: true,
});

const TYPE_OPTIONS = [
  { value: "printer", label: "Impressoras" },
  { value: "dryer", label: "Secadoras" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Em uso" },
  { value: "inactive", label: "Inativos" },
];

const SECTIONS: { type: EquipmentType; title: string; subtitle: string }[] = [
  { type: "printer", title: "Impressoras", subtitle: "Depreciação + energia + manutenção por hora de impressão." },
  { type: "dryer", title: "Secadoras de filamento", subtitle: "Depreciação + energia por hora de secagem." },
];

export const Equipment = () => {
  const { items, loading, error, reload } = useResource<EquipmentDoc>("/equipment");
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [filters, setFilters] = useFilters(
    { search: "", type: "", brand: "", status: "" },
    "filtros-equipamentos",
  );

  const visible = useMemo(
    () =>
      items.filter(
        (equipment) =>
          matches([equipment.name, equipment.brand, equipment.notes].join(" "), filters.search) &&
          (!filters.type || equipment.type === filters.type) &&
          (!filters.brand || equipment.brand === filters.brand) &&
          (!filters.status || (filters.status === "active") === (equipment.active !== false)),
      ),
    [items, filters],
  );

  const save = async (values: FormValues) => {
    if (values.id) {
      await api.put(`/equipment/${values.id}`, values);
    } else {
      await api.post("/equipment", values);
    }
    await reload();
  };

  const remove = async (equipment: EquipmentDoc) => {
    const confirmed = await confirm({
      title: `Excluir "${equipment.name}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });

    if (confirmed) {
      await api.delete(`/equipment/${equipment.id}`);
      await reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Equipamentos"
        subtitle="O valor de cada equipamento é diluído pelas horas de uso e somado ao custo de cada peça."
      />
      <FilterBar
        search={filters.search}
        onSearch={(search) => setFilters({ search })}
        placeholder="Buscar equipamento…"
        selects={[
          { key: "type", label: "Tipo", value: filters.type, options: TYPE_OPTIONS },
          { key: "brand", label: "Marca", value: filters.brand, options: uniqueSorted(items.map((equipment) => equipment.brand)) },
          { key: "status", label: "Situação", value: filters.status, options: STATUS_OPTIONS },
        ]}
        onSelect={(key, value) => setFilters({ [key]: value })}
        onClear={() => setFilters(null)}
        count={visible.length}
        total={items.length}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {SECTIONS.filter((section) => !filters.type || filters.type === section.type).map((section) => {
        const list = visible.filter((equipment) => equipment.type === section.type);

        return (
          <Section
            key={section.type}
            title={section.title}
            subtitle={section.subtitle}
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={() => setEditing(blankFor(section.type))}>
                Adicionar
              </Button>
            }
          >
            {!loading && !list.length && (
              <EmptyState>
                {items.some((equipment) => equipment.type === section.type) ? "Nenhum com esses filtros." : "Nada cadastrado."}
              </EmptyState>
            )}
            {list.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipamento</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell align="right">Vida útil</TableCell>
                      <TableCell align="right">Consumo</TableCell>
                      <TableCell align="right">Custo/h</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map((equipment) => {
                      const hourlyCost = equipmentHourlyCost(equipment);

                      return (
                        <TableRow key={equipment.id} sx={{ opacity: equipment.active === false ? 0.55 : 1 }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                              <Photo url={equipment.photoUrl} alt={equipment.name} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {equipment.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                  {equipment.brand}
                                </Typography>
                              </Box>
                              {equipment.active === false && <Chip label="inativo" size="small" />}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{money(equipment.price)}</TableCell>
                          <TableCell align="right">{equipment.lifespanHours} h</TableCell>
                          <TableCell align="right">{equipment.powerWatts} W</TableCell>
                          <TableCell align="right">{money(hourlyCost.depreciation + hourlyCost.maintenance)}</TableCell>
                          <TableCell align="right">
                            <RowActions
                              actions={[
                                { label: "Editar", icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setEditing(equipment) },
                                { label: "Excluir", icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => remove(equipment) },
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
          </Section>
        );
      })}

      {editing && (
        <FormDialog
          title={`${editing.id ? "Editar" : "Nova"} ${editing.type === "printer" ? "impressora" : "secadora"}`}
          fields={fieldsFor(editing.type)}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        >
          {(values) => {
            const hourlyCost = equipmentHourlyCost(values);

            return values.price > 0 && values.lifespanHours > 0 ? (
              <Alert severity="info" icon={false} sx={{ mt: 2 }}>
                Depreciação: <b>{money(hourlyCost.depreciation)}/h</b> · Energia:{" "}
                <b>{hourlyCost.energyKwh.toFixed(3)} kWh/h</b>
              </Alert>
            ) : null;
          }}
        </FormDialog>
      )}
    </>
  );
};
