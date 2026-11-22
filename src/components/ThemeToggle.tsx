import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

/** Alterna claro/escuro (o MUI lembra a escolha no localStorage). */
export const ThemeToggle = () => {
  const { mode, systemMode, setMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";

  return (
    <Tooltip title={isDark ? "Usar tema claro" : "Usar tema escuro"}>
      <IconButton onClick={() => setMode(isDark ? "light" : "dark")}>
        {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
};
