import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// ---------------------------------------------
// ⚙️ Vite Build Configuration
// ---------------------------------------------
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/public", // ✅ match the server path
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
