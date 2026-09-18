import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    // Binds to 0.0.0.0 instead of just localhost, so a phone on the same
    // Wi-Fi can open the dev server directly (e.g. http://<mac-lan-ip>:5173)
    // for real-device testing instead of only the emulated browser preview.
    host: true,
  },
})
