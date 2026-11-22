import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Em desenvolvimento, /api/... é repassado para a custo3d-api em localhost:3333
 * (sem o prefixo /api). Em produção o front usa API_URL (veja src/api.ts).
 */
export default defineConfig({
  plugins: [react()],
  // Por padrão o Vite só expõe ao navegador variáveis VITE_*. Com isto, API_URL também vai.
  envPrefix: ["VITE_", "API_"],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
