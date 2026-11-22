import SearchIcon from "@mui/icons-material/Search";
import {
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

export interface Option {
  value: string;
  label: string;
}

export interface SelectFilter {
  key: string;
  label: string;
  value: string;
  /** Texto simples ou { value, label }. A opção "Todos" entra sozinha. */
  options: (string | Option)[];
}

interface FilterBarProps {
  search: string;
  onSearch: (search: string) => void;
  placeholder?: string;
  selects?: SelectFilter[];
  onSelect?: (key: string, value: string) => void;
  /** Conteúdo extra (ex.: chips "Acabando", "Arquivados"). */
  extra?: ReactNode;
  onClear: () => void;
  count: number;
  total: number;
}

export const toOption = (option: string | Option): Option =>
  typeof option === "string" ? { value: option, label: option } : option;

/** Busca + selects + extras. A filtragem em si acontece na tela, no navegador. */
export const FilterBar = ({
  search,
  onSearch,
  placeholder = "Buscar…",
  selects = [],
  onSelect,
  extra,
  onClear,
  count,
  total,
}: FilterBarProps) => {
  const active =
    search !== "" || selects.some((select) => select.value !== "") || count !== total;

  return (
    <Paper
      role="search"
      sx={{
        p: 1.5,
        mb: 3,
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
      }}
    >
      <TextField
        type="search"
        placeholder={placeholder}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        sx={{ flex: "1 1 240px", width: "auto" }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { "aria-label": "Buscar" },
        }}
      />
      {selects.map((select) => (
        <TextField
          key={select.key}
          select
          label={select.label}
          value={select.value}
          onChange={(event) => onSelect?.(select.key, event.target.value)}
          sx={{ flex: "1 1 150px", width: "auto", maxWidth: { sm: 200 } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {select.options.map(toOption).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      {extra}
      <Typography variant="body2" sx={{ color: "text.secondary", ml: { sm: "auto" }, whiteSpace: "nowrap" }}>
        {count === total ? `${total} itens` : `${count} de ${total}`}
      </Typography>
      {active && (
        <Button size="small" onClick={onClear}>
          Limpar
        </Button>
      )}
    </Paper>
  );
};
