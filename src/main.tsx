import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { FeedbackProvider } from "./components/FeedbackProvider";
import { theme } from "./theme";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado no index.html.");
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <FeedbackProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </FeedbackProvider>
    </ThemeProvider>
  </StrictMode>,
);
