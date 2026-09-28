// Runs before `vite` (see package.json "dev"): starts the sibling Strapi CMS
// if nothing is listening on its port yet, so the site never comes up empty.
import { spawn } from "node:child_process"
import { existsSync, openSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PORT = 1337
const cmsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../pixelwave-cms")

function isListening() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: "127.0.0.1" })
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("error", () => resolve(false))
  })
}

if (await isListening()) {
  console.log(`[strapi] already running on :${PORT}`)
} else if (!existsSync(cmsDir)) {
  console.warn(`[strapi] CMS folder not found at ${cmsDir} — skipping`)
} else {
  console.log("[strapi] not running — starting it…")
  const log = openSync("/tmp/strapi.log", "a")
  const child = spawn("npm", ["run", "develop"], {
    cwd: cmsDir,
    // The preview tool launches this with PORT=5173 (for Vite) in the
    // environment — Strapi reads the same variable, so without this override
    // it would come up on Vite's port instead of 1337.
    env: { ...process.env, PORT: String(PORT) },
    detached: true,
    stdio: ["ignore", log, log],
  })
  child.unref()

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline && !(await isListening())) {
    await new Promise((r) => setTimeout(r, 1000))
  }
  console.log((await isListening()) ? `[strapi] ready on :${PORT}` : "[strapi] still starting — see /tmp/strapi.log")
}
