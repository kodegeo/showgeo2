import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // ✅ CRITICAL: Dedupe React to ensure single instance (fixes React error #310)
    // This prevents multiple React instances from being bundled, which causes:
    // "Minified React error #310: https://react.dev/errors/310" in production
    // 
    // How it works:
    // - Forces all imports of "react" and "react-dom" to resolve to the same instance
    // - Prevents nested node_modules from creating duplicate React bundles
    // - Ensures React hooks and context work correctly across the entire app
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
      // ✅ No React aliases needed - dedupe handles it
      // Explicit aliases can cause issues, so we rely on dedupe only
    },
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

