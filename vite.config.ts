import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Em desenvolvimento, /api/... é repassado para a custo3d-api em localhost:3333
 * (sem o prefixo /api). Em produção o front usa VITE_API_URL (veja src/api.ts).
 */
export default defineConfig({
  plugins: [react()],
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
