import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import {
  Box,
  CircularProgress,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  type TextFieldProps,
} from "@mui/material";
import type { ReactNode } from "react";

/** Mensagem de lista vazia. */
export const EmptyState = ({ children }: { children: ReactNode }) => (
  <Stack
    spacing={1}
    sx={{ py: 5, alignItems: "center", color: "text.secondary", textAlign: "center" }}
  >
    <InboxOutlinedIcon />
    <Typography variant="body2">{children}</Typography>
  </Stack>
);

export const Loading = () => (
  <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
    <CircularProgress size={28} />
  </Box>
);

/** Card com título opcional e ação à direita. */
export const Section = ({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
    {(title || action) && (
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2, justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <Box>
          {title && <Typography variant="h6">{title}</Typography>}
          {subtitle && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
    )}
    {children}
  </Paper>
);

/** Grade responsiva de campos/cards: tantas colunas quanto couberem. */
export const FieldGrid = ({
  children,
  minWidth = 220,
}: {
  children: ReactNode;
  minWidth?: number;
}) => (
  <Box
    sx={{
      display: "grid",
      gap: 2,
      gridTemplateColumns: `repeat(auto-fill, minmax(min(${minWidth}px, 100%), 1fr))`,
    }}
  >
    {children}
  </Box>
);

/** Barra de quanto resta (carretel, material). */
export const StockBar = ({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color?: string;
}) => (
  <LinearProgress
    variant="determinate"
    value={max > 0 ? Math.min(100, (value / max) * 100) : 0}
    sx={{
      height: 6,
      borderRadius: 99,
      my: 1,
      ...(color && { "& .MuiLinearProgress-bar": { backgroundColor: color } }),
    }}
  />
);

type NumberFieldProps = Omit<TextFieldProps, "value" | "onChange"> & {
  value: number | "" | undefined;
  onChange: (value: number | "") => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number | "any";
};

/** Campo numérico com sufixo (R$, g, min…). Vazio vira "" para o usuário poder apagar e redigitar. */
export const NumberField = ({
  value,
  onChange,
  suffix,
  min = 0,
  max,
  step = "any",
  ...props
}: NumberFieldProps) => (
  <TextField
    {...props}
    type="number"
    value={value ?? ""}
    onChange={(event) =>
      onChange(event.target.value === "" ? "" : Number(event.target.value))
    }
    slotProps={{
      input: suffix
        ? { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> }
        : undefined,
      htmlInput: { min, max, step },
    }}
  />
);

/** Tempo em horas + minutos; o valor é guardado em horas decimais (2h30 = 2.5). */
export const TimeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (hours: number) => void;
}) => {
  const totalMinutes = Math.round((Number(value) || 0) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const update = (newHours: number | "", newMinutes: number | "") =>
    onChange((Number(newHours) || 0) + (Number(newMinutes) || 0) / 60);

  return (
    <Stack direction="row" spacing={1}>
      <NumberField
        label={label}
        suffix="h"
        step={1}
        value={wholeHours}
        onChange={(newHours) => update(newHours, minutes)}
      />
      <NumberField
        label="Minutos"
        suffix="min"
        step={1}
        max={59}
        value={minutes}
        onChange={(newMinutes) => update(wholeHours, newMinutes)}
      />
    </Stack>
  );
};
