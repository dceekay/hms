import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["framer-motion", "lucide-react", "react-icons"],
          "vendor-charts": ["recharts", "react-countup"],
          "vendor-utils": [
            "axios",
            "zod",
            "sweetalert2",
            "qrcode",
            "zustand",
            "@tanstack/react-query",
          ],
        },
      },
    },
  },
});
