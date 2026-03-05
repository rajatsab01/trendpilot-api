import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "src", "assets"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@server": path.resolve(__dirname, "..", "server"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
