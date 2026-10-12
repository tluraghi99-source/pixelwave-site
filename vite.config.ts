import path from "node:path"
import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/** Dev only. With VITE_DEV_CMS_PROXY set (in .env.local, which is not
 *  committed), the dev server forwards the CMS's /api and /uploads to that
 *  address — typically the live CMS — so the local preview always shows the
 *  real, current content, without CORS changes on the server.
 *
 *  Read-only on purpose: anything but GET/HEAD/OPTIONS is refused here, so a
 *  test submission of the Contact or Careers form can't reach the live CMS
 *  (it would be saved for real and email info@). */
function readOnlyCmsGuard(): Plugin {
  return {
    name: "read-only-cms-guard",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next()
        res.statusCode = 405
        res.setHeader("Content-Type", "application/json")
        res.end(
          JSON.stringify({
            error: {
              status: 405,
              message:
                "Writes to the live CMS are blocked in local development (VITE_DEV_CMS_PROXY). Remove it from .env.local to use the local CMS.",
            },
          })
        )
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const cmsProxy = env.VITE_DEV_CMS_PROXY || ""

  return {
    plugins: [react(), tailwindcss(), ...(cmsProxy ? [readOnlyCmsGuard()] : [])],
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
      ...(cmsProxy
        ? {
            proxy: {
              "/api": { target: cmsProxy, changeOrigin: true, secure: true },
              "/uploads": { target: cmsProxy, changeOrigin: true, secure: true },
            },
          }
        : {}),
    },
  }
})
