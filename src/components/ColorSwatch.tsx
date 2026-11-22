import { Box } from "@mui/material";
import type { ColorMode } from "../lib/types";

/** Qualquer coisa com cores: um carretel ou o filamento salvo numa impressão. */
export interface HasColors {
  colors?: string[];
  colorHex?: string;
  colorMode?: ColorMode;
}

/** Cores de um item; carretéis antigos só têm `colorHex`. */
export const colorsOf = (item?: HasColors | null): string[] =>
  item?.colors?.length ? item.colors : [item?.colorHex || "#cccccc"];

/** Fundo CSS da amostra: cor única, faixas (paradas duras) ou degradê. */
export const swatchBackground = (
  colors: string[],
  mode: ColorMode = "solid",
  angle = 90,
): string => {
  if (colors.length <= 1 || mode === "solid") {
    return colors[0];
  }

  if (mode === "gradient") {
    return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
  }

  const step = 100 / colors.length;
  const stops = colors.map(
    (color, index) => `${color} ${index * step}% ${(index + 1) * step}%`,
  );

  return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
};

interface ColorSwatchProps {
  item?: HasColors | null;
  /** "dot" = bolinha; "bar" = faixa larga. */
  shape?: "dot" | "bar";
  size?: number;
  title?: string;
}

export const ColorSwatch = ({
  item,
  shape = "dot",
  size = 16,
  title,
}: ColorSwatchProps) => {
  const background = swatchBackground(
    colorsOf(item),
    item?.colorMode,
    shape === "dot" ? 135 : 90,
  );

  if (shape === "bar") {
    return <Box title={title} sx={{ height: 8, background }} />;
  }

  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background,
        boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.divider}`,
      }}
    />
  );
};
