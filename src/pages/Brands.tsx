import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { api } from "../api";
import { EmptyState } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { FormDialog, type FieldDef, type FormValues } from "../components/FormDialog";
import { PageHeader } from "../components/PageHeader";
import { RowActions } from "../components/RowActions";
import { useResource } from "../hooks/useResource";
import { grams } from "../lib/format";
import { MATERIALS, TYPE_SUGGESTIONS } from "../lib/materials";
import type { BrandDoc, BrandMaterial, SpoolDoc } from "../lib/types";

interface MaterialsEditorProps {
  value: BrandMaterial[];
  onChange: (materials: BrandMaterial[]) => void;
}

/** Uma linha por material, com os tipos em chips (digite e Enter para adicionar). */
const MaterialsEditor = ({ value, onChange }: MaterialsEditorProps) => {
  const update = (position: number, patch: Partial<BrandMaterial>) =>
    onChange(value.map((row, index) => (index === position ? { ...row, ...patch } : row)));

  return (
    <Stack spacing={1.5}>
      {value.map((row, index) => (
        <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" } }}>
          <Autocomplete
            freeSolo
            options={MATERIALS}
            inputValue={row.material}
            onInputChange={(_, material) => update(index, { material })}
            sx={{ minWidth: 140 }}
            renderInput={(params) => <TextField {...params} label="Material" size="small" />}
          />
          <Autocomplete
            multiple
            freeSolo
            options={TYPE_SUGGESTIONS}
            value={row.types}
            onChange={(_, types) => update(index, { types: types as string[] })}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField {...params} label="Tipos" size="small" placeholder="Ex.: Lite, Silk, Rainbow" />
            )}
          />
          <IconButton aria-label="Remover material" onClick={() => onChange(value.filter((_, position) => position !== index))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...value, { material: "", types: [] }])}>
          Adicionar material
        </Button>
      </Box>
    </Stack>
  );
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Nome da marca", required: true, full: true, placeholder: "Ex.: Voolt3D" },
  {
    name: "materials",
    label: "Materiais e tipos",
    full: true,
    help: "Ex.: PLA com os tipos Lite, Silk e Rainbow. No cadastro do carretel, a marca oferece só estes.",
    render: (values, setValue) => (
      <MaterialsEditor value={values.materials ?? []} onChange={(materials) => setValue("materials", materials)} />
    ),
  },
  {
    name: "emptySpoolGrams",
    label: "Carretel vazio (tara)",
    type: "number",
    suffix: "g",
    help: "Padrão dos carretéis desta marca. Dá para ajustar na hora de pesar.",
  },
  { name: "notes", label: "Observações", type: "textarea", full: true },
];

const BLANK_BRAND: FormValues = { name: "", materials: [{ material: "PLA", types: [] }], emptySpoolGrams: 0, notes: "" };

/** Marcas de filamento (/marcas): o que cada marca vende, por material e tipo. */
export const Brands = () => {
  const { items, loading, error, reload } = useResource<BrandDoc>("/brands");
  const { items: spools } = useResource<SpoolDoc>("/spools?all=true");
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<FormValues | null>(null);

  const spoolCountByBrand: Record<string, number> = {};
  for (const spool of spools) {
    if (spool.brandId) {
      spoolCountByBrand[spool.brandId] = (spoolCountByBrand[spool.brandId] ?? 0) + 1;
    }
  }

  const save = async (values: FormValues) => {
    if (values.id) {
      await api.put(`/brands/${values.id}`, values);
    } else {
      await api.post("/brands", values);
    }
    await reload();
  };

  const remove = async (brand: BrandDoc) => {
    const used = spoolCountByBrand[brand.id] ?? 0;
    const confirmed = await confirm({
      title: `Excluir a marca "${brand.name}"?`,
      message: used
        ? `${used} carretel(is) continuam com o nome "${brand.name}", mas deixam de estar ligados ao cadastro.`
        : undefined,
      confirmLabel: "Excluir",
      danger: true,
    });

    if (confirmed) {
      await api.delete(`/brands/${brand.id}`);
      await reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Marcas"
        subtitle="Cadastre o que cada marca vende: material e tipos (Lite, Silk, Rainbow…)."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(BLANK_BRAND)}>
            Nova marca
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !items.length && <EmptyState>Nenhuma marca cadastrada ainda.</EmptyState>}

      {items.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Marca</TableCell>
                <TableCell>Materiais e tipos</TableCell>
                <TableCell align="right">Tara</TableCell>
                <TableCell align="right">Carretéis</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((brand) => (
                <TableRow key={brand.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{brand.name}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {brand.materials.map((row) => (
                        <Stack key={row.material} direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 48 }}>
                            {row.material}
                          </Typography>
                          {row.types.length ? (
                            row.types.map((type) => <Chip key={type} label={type} size="small" />)
                          ) : (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              sem tipos
                            </Typography>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{brand.emptySpoolGrams ? grams(brand.emptySpoolGrams) : "—"}</TableCell>
                  <TableCell align="right">{spoolCountByBrand[brand.id] ?? 0}</TableCell>
                  <TableCell align="right">
                    <RowActions
                      actions={[
                        { label: "Editar", icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setEditing(brand) },
                        { label: "Excluir", icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => remove(brand) },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {editing && (
        <FormDialog
          title={editing.id ? `Editar ${editing.name}` : "Nova marca"}
          fields={FIELDS}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
};
