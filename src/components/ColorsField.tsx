import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import type { ColorMode } from "../lib/types";
import { ColorSwatch } from "./ColorSwatch";

/** Cores sugeridas ao adicionar uma nova (a inicial de um carretel novo é azul). */
const SUGGESTIONS = ["#e11d48", "#f59e0b", "#16a34a", "#7c3aed", "#0891b2", "#111111", "#ffffff", "#2563eb"];

/** Seletor de cor nativo com o visual dos campos do MUI. */
const ColorInput = styled("input")(({ theme }) => ({
  width: 40,
  height: 32,
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
  borderRadius: theme.shape.borderRadius,
}));

const ColorChip = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: 2,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

interface ColorsFieldProps {
  colors: string[];
  mode: ColorMode;
  onChange: (colors: string[], mode: ColorMode) => void;
}

/** Várias cores (Duo/Tri Color, Rainbow) e como desenhá-las: faixas ou degradê. */
export const ColorsField = ({ colors, mode, onChange }: ColorsFieldProps) => {
  const list = colors.length ? colors : ["#3b82f6"];
  const isMulticolor = list.length > 1;
  // Com 2+ cores e modo "solid", assume faixas (o caso mais comum: Duo Color).
  const effectiveMode: ColorMode = isMulticolor
    ? mode === "solid" ? "stripes" : mode
    : "solid";
  const preview = { colors: list, colorMode: effectiveMode };

  const setColorAt = (position: number, value: string) =>
    onChange(
      list.map((color, index) => (index === position ? value : color)),
      effectiveMode,
    );

  const addColor = () =>
    onChange(
      [...list, SUGGESTIONS[(list.length - 1) % SUGGESTIONS.length]],
      effectiveMode,
    );

  const removeColor = (position: number) =>
    onChange(
      list.filter((_, index) => index !== position),
      effectiveMode,
    );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {list.map((color, index) => (
          <ColorChip key={index}>
            <ColorInput
              type="color"
              value={color}
              onChange={(event) => setColorAt(index, event.target.value)}
              aria-label={`Cor ${index + 1}`}
            />
            {isMulticolor && (
              <IconButton
                size="small"
                onClick={() => removeColor(index)}
                aria-label={`Remover cor ${index + 1}`}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </ColorChip>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addColor}>
          Cor
        </Button>
      </Stack>

      {isMulticolor && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={effectiveMode}
          onChange={(_, value: ColorMode | null) => {
            if (value) {
              onChange(list, value);
            }
          }}
        >
          <ToggleButton value="stripes">Faixas (Duo/Tri)</ToggleButton>
          <ToggleButton value="gradient">Degradê (Rainbow)</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, borderRadius: 99, overflow: "hidden" }}>
          <ColorSwatch item={preview} shape="bar" />
        </Box>
        <ColorSwatch item={preview} size={22} />
      </Stack>
    </Stack>
  );
};
