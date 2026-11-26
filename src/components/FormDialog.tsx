import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent, type ReactNode } from "react";
import { errorMessage } from "../api";
import { toInputDate } from "../lib/format";
import { NumberField } from "./common";
import { toOption, type Option } from "./FilterBar";

// Formulários genéricos: os valores variam de tela para tela.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues = Record<string, any>;

type SetValue = (name: string, value: unknown) => void;

/** Descrição de um campo; o FormDialog monta o input a partir dela. */
export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "switch";
  /** Opções do select. Pode depender dos outros campos (ex.: materiais da marca escolhida). */
  options?: (string | Option)[] | ((values: FormValues) => (string | Option)[]);
  /** Sugestões de texto livre (ex.: marcas e categorias já usadas). */
  suggestions?: string[];
  suffix?: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** Ocupa a linha inteira. */
  full?: boolean;
  /** Campo personalizado (foto, cores, materiais da marca…). */
  render?: (values: FormValues, setValue: SetValue) => ReactNode;
}

const Field = ({
  field,
  values,
  setValue,
}: {
  field: FieldDef;
  values: FormValues;
  setValue: SetValue;
}) => {
  const value = values[field.name];

  if (field.render) {
    return (
      <Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {field.label}
        </Typography>
        {field.render(values, setValue)}
        {field.help && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {field.help}
          </Typography>
        )}
      </Box>
    );
  }

  if (field.type === "switch") {
    return (
      <FormControlLabel
        label={field.label}
        control={
          <Switch
            checked={Boolean(value)}
            onChange={(event) => setValue(field.name, event.target.checked)}
          />
        }
      />
    );
  }

  if (field.type === "number") {
    return (
      <NumberField
        label={field.label}
        value={value}
        onChange={(newValue) => setValue(field.name, newValue)}
        suffix={field.suffix}
        helperText={field.help}
        required={field.required}
      />
    );
  }

  if (field.suggestions) {
    return (
      <Autocomplete
        freeSolo
        options={field.suggestions}
        inputValue={value ?? ""}
        onInputChange={(_, newValue) => setValue(field.name, newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            placeholder={field.placeholder}
            helperText={field.help}
            required={field.required}
          />
        )}
      />
    );
  }

  return (
    <TextField
      select={field.type === "select"}
      type={field.type === "date" ? "date" : "text"}
      multiline={field.type === "textarea"}
      minRows={field.type === "textarea" ? 3 : undefined}
      label={field.label}
      value={field.type === "date" ? toInputDate(value) : (value ?? "")}
      onChange={(event) => setValue(field.name, event.target.value)}
      placeholder={field.placeholder}
      helperText={field.help}
      required={field.required}
      slotProps={field.type === "date" ? { inputLabel: { shrink: true } } : undefined}
    >
      {(typeof field.options === "function" ? field.options(values) : (field.options ?? [])).map(toOption).map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

interface FormDialogProps {
  title: string;
  fields: FieldDef[];
  initial: FormValues;
  onSubmit: (values: FormValues) => Promise<unknown>;
  onClose: () => void;
  /** Conteúdo extra abaixo dos campos, com acesso aos valores (ex.: prévia de custo). */
  children?: (values: FormValues) => ReactNode;
}

/** Formulário montado a partir de `fields`, num diálogo com Cancelar/Salvar. */
export const FormDialog = ({
  title,
  fields,
  initial,
  onSubmit,
  onClose,
  children,
}: FormDialogProps) => {
  const [values, setValues] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setValue: SetValue = (name, value) =>
    setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit: submit } }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            pt: 1,
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          {fields.map((field) => (
            <Box key={field.name} sx={{ gridColumn: field.full ? "1 / -1" : undefined }}>
              <Field field={field} values={values} setValue={setValue} />
            </Box>
          ))}
        </Box>
        {children?.(values)}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
