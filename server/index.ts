import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "client", // 👈 add this if index.html is inside "client"
  build: {
    outDir: "../dist/public", // 👈 build outside to dist/public
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"), // 👈 adjust if needed
    },
  },
  server: {
    port: 5173,
  },
});
