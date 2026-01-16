import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:9050",
      "/maimai-mobile/img": {
        target: "https://maimai.wahlap.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
