import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // ✅ CRITICAL: Explicit aliases + dedupe to enforce single React instance
    // Fixes React error #310: https://react.dev/errors/310
    // 
    // Explicit aliases force all React imports to resolve to the same path
    // Dedupe ensures nested node_modules don't create duplicate instances
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
      // ✅ Explicit React aliases - force single instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  // ✅ Disable React pre-bundling to prevent duplication
  // Vite's optimizeDeps can create duplicate React instances during dev
  optimizeDeps: {
    exclude: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

