import { Chip, Stack, Typography } from "@mui/material";
import { useResource } from "../hooks/useResource";
import type { FinishDoc } from "../lib/types";

/** Acabamentos (Silk, Matte, Duo Color…). Os carretéis guardam só os ids. */
export const useFinishes = () => useResource<FinishDoc>("/finishes");

export const finishName = (finishes: FinishDoc[], id: string) =>
  finishes.find((finish) => finish.id === id)?.name;

interface FinishPickerProps {
  finishes: FinishDoc[];
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Seleção múltipla em chips. */
export const FinishPicker = ({ finishes, value, onChange }: FinishPickerProps) => {
  if (!finishes.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Cadastre acabamentos em Configurações.
      </Typography>
    );
  }

  const toggle = (id: string) =>
    onChange(
      value.includes(id)
        ? value.filter((selectedId) => selectedId !== id)
        : [...value, id],
    );

  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
      {finishes.map((finish) => {
        const selected = value.includes(finish.id);

        return (
          <Chip
            key={finish.id}
            label={finish.name}
            color={selected ? "primary" : "default"}
            variant={selected ? "filled" : "outlined"}
            onClick={() => toggle(finish.id)}
          />
        );
      })}
    </Stack>
  );
};

interface FinishTagsProps {
  finishes: FinishDoc[];
  ids?: string[];
}

export const FinishTags = ({ finishes, ids = [] }: FinishTagsProps) => {
  const names = ids
    .map((id) => finishName(finishes, id))
    .filter((name): name is string => Boolean(name));

  if (!names.length) {
    return null;
  }

  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {names.map((name) => (
        <Chip key={name} label={name} size="small" />
      ))}
    </Stack>
  );
};
