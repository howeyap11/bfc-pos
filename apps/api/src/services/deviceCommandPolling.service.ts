import type { FastifyInstance } from "fastify";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { runCatalogSync, runTransactionSyncFlush } from "./syncScheduler.js";
import { setCommandState } from "./commandState.service.js";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const DEVICE_KEY = process.env.DEVICE_KEY ?? "";
const POS_VERSION = process.env.POS_VERSION ?? "1.0.0";

const COMMAND_POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 min
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;   // 5 min

let pollInFlight = false;
let lastHeartbeat = 0;

async function postStatus(
  commandId: string,
  status: "RUNNING" | "SUCCESS" | "FAILED",
  errorMessage?: string
): Promise<boolean> {
  const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/commands/${commandId}/status`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-Key": DEVICE_KEY,
  };
  const body = JSON.stringify(
    errorMessage !== undefined ? { status, errorMessage } : { status }
  );
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns trusted script path for UPDATE_POS. Only allows:
 * - Default: scripts/windows/update-pos.cmd under repo root
 * - UPDATE_SCRIPT env: must be absolute path under repo root, extension .cmd or .bat
 * Never uses shell input or arbitrary paths.
 */
function getTrustedUpdateScriptPath(): string | null {
  const repoRoot = resolve(process.cwd(), "..", "..");
  const defaultPath = join(repoRoot, "scripts", "windows", "update-pos.cmd");

  const custom = process.env.UPDATE_SCRIPT?.trim();
  if (!custom) {
    return existsSync(defaultPath) ? defaultPath : null;
  }

  const abs = resolve(custom);
  const ext = abs.toLowerCase().slice(-4);
  const underRepo = abs.startsWith(repoRoot) && (ext === ".cmd" || ext === ".bat");
  return underRepo && existsSync(abs) ? abs : null;
}

async function runCommand(
  app: FastifyInstance,
  commandId: string,
  type: string
): Promise<void> {
  await postStatus(commandId, "RUNNING");

  try {
    if (type === "FORCE_SYNC") {
      setCommandState("syncing");
      try {
        await runCatalogSync(app);
        await runTransactionSyncFlush(app);
        await postStatus(commandId, "SUCCESS");
      } finally {
        setCommandState("idle");
      }
    } else if (type === "RESTART_POS") {
      setCommandState("restarting");
      setTimeout(() => process.exit(0), 3000);
      return;
    } else if (type === "UPDATE_POS") {
      const scriptPath = getTrustedUpdateScriptPath();
      if (!scriptPath) {
        setCommandState("failed", "UPDATE_SCRIPT not found or invalid");
        await postStatus(commandId, "FAILED", "Trusted update script not found");
        return;
      }

      setCommandState("updating");
      const { spawn } = await import("node:child_process");
      const repoRoot = resolve(process.cwd(), "..", "..");

      const child = spawn(scriptPath, [], {
        shell: true,
        stdio: "pipe",
        cwd: repoRoot,
      });

      let stderr = "";
      child.stderr?.on("data", (ch) => (stderr += String(ch)));

      try {
        await new Promise<void>((resolve, reject) => {
          child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `Exit code ${code}`));
          });
          child.on("error", reject);
        });
        await postStatus(commandId, "SUCCESS");
        setCommandState("idle");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setCommandState("failed", msg);
        await postStatus(commandId, "FAILED", msg);
        throw err;
      }
    } else {
      await postStatus(commandId, "FAILED", `Unknown command: ${type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (type !== "UPDATE_POS") setCommandState("failed", msg);
    app.log.warn({ err, commandId, type }, "Command execution failed");
    await postStatus(commandId, "FAILED", msg);
  }
}

export async function pollDeviceCommands(app: FastifyInstance): Promise<void> {
  if (!CLOUD_URL?.trim() || !DEVICE_KEY?.trim()) return;
  if (pollInFlight) return;

  pollInFlight = true;
  try {
    const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/commands/pending`;
    const res = await fetch(url, {
      headers: { "X-Device-Key": DEVICE_KEY },
    });

    if (!res.ok) {
      app.log.debug({ status: res.status }, "Device command poll failed");
      return;
    }

    const data = (await res.json()) as { commands?: Array<{ id: string; type: string }> };
    const commands = data?.commands ?? [];

    for (const cmd of commands) {
      app.log.info({ commandId: cmd.id, type: cmd.type }, "Executing device command");
      await runCommand(app, cmd.id, cmd.type);
      if (cmd.type === "RESTART_POS") return; // Exiting soon
    }
  } catch (err) {
    app.log.debug({ err }, "Device command poll error");
  } finally {
    pollInFlight = false;
  }
}

export async function sendHeartbeat(): Promise<void> {
  if (!CLOUD_URL?.trim() || !DEVICE_KEY?.trim()) return;
  const now = Date.now();
  if (now - lastHeartbeat < HEARTBEAT_INTERVAL_MS) return;
  lastHeartbeat = now;

  try {
    const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/device/heartbeat`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Key": DEVICE_KEY,
      },
      body: JSON.stringify({ posVersion: POS_VERSION }),
    });
  } catch {
    // Silent - heartbeat is best-effort
  }
}

export function startDeviceCommandPolling(app: FastifyInstance): void {
  if (!CLOUD_URL?.trim() || !DEVICE_KEY?.trim()) {
    app.log.info("Device command polling disabled: CLOUD_URL or DEVICE_KEY not set");
    return;
  }

  setInterval(() => pollDeviceCommands(app), COMMAND_POLL_INTERVAL_MS);
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Initial poll after 30s (let server settle)
  setTimeout(() => pollDeviceCommands(app), 30_000);
  sendHeartbeat();

  app.log.info("Device command polling started: every 2min");
}
