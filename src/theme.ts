import { createTheme } from "@mui/material/styles";

/** Tema minimalista: superfícies planas com borda fina, cantos arredondados e Inter. */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#4f46e5" },
        background: { default: "#f7f7f9", paper: "#ffffff" },
        divider: "#e7e7ec",
      },
    },
    dark: {
      palette: {
        primary: { main: "#818cf8" },
        background: { default: "#0e0e12", paper: "#17171c" },
        divider: "#2a2a32",
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "\"Inter\", system-ui, sans-serif",
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600, fontSize: "1rem" },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      defaultProps: { variant: "outlined" },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiTextField: {
      defaultProps: { size: "small", fullWidth: true },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme: currentTheme }) => ({
          color: currentTheme.palette.text.secondary,
          fontWeight: 500,
        }),
      },
    },
  },
});
