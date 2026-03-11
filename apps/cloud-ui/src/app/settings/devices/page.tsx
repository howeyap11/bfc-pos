"use client";

import { useEffect, useState } from "react";
import { api, type DeviceInfo } from "@/lib/api";
import { COLORS } from "@/lib/theme";

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addName, setAddName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newDeviceKey, setNewDeviceKey] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);

  function load() {
    api
      .getDevices()
      .then((r) => setDevices(r.devices))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!addName.trim()) return;
    try {
      const r = await api.createDevice({ name: addName.trim() });
      setNewDeviceKey(r.device.deviceKey);
      setSuccess("Device created. Copy the Device Key and add it to the POS .env as DEVICE_KEY=...");
      setAddName("");
      load();
    } catch (err: unknown) {
      const b = (err as { body?: { message?: string } })?.body;
      setError(b?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  async function handleCommand(deviceId: string, type: "UPDATE_POS" | "RESTART_POS" | "FORCE_SYNC") {
    setError("");
    setSuccess("");
    setCommandLoading(deviceId);
    try {
      await api.createDeviceCommand(deviceId, type);
      setSuccess(`Command ${type} sent. The POS will pick it up on next poll (within ~2 min).`);
      load();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: unknown) {
      const b = (err as { body?: { message?: string } })?.body;
      setError(b?.message ?? (err instanceof Error ? err.message : "Failed"));
    } finally {
      setCommandLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this device? Commands will no longer reach it.")) return;
    setError("");
    try {
      await api.deleteDevice(id);
      setSuccess("Device removed.");
      load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const b = (err as { body?: { message?: string } })?.body;
      setError(b?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  const panelStyle = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-white">POS Devices</h1>
      <p className="mb-6 text-sm text-white/60">
        Manage POS devices and send remote commands (update, restart, force sync). Add a device, copy its key to the
        mini PC&apos;s <code className="rounded bg-white/10 px-1">apps/api/.env</code> as{" "}
        <code className="rounded bg-white/10 px-1">DEVICE_KEY=...</code>, and ensure <code className="rounded bg-white/10 px-1">CLOUD_URL</code> is set.
      </p>

      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="mb-6 rounded-lg border p-6" style={panelStyle}>
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded border px-4 py-2 text-sm font-medium"
            style={{ borderColor: COLORS.primary, color: COLORS.primary }}
          >
            + Add device
          </button>
        ) : (
          <form onSubmit={handleAddDevice} className="space-y-3">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Device name (e.g. Café POS 1)"
              className="w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40"
              style={{ background: COLORS.bgDark, borderColor: COLORS.borderLight }}
              autoFocus
            />
            {newDeviceKey && (
              <div className="rounded border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="mb-1 text-xs font-medium text-amber-400">Device key (copy and add to POS .env):</p>
                <code className="break-all text-sm text-white">{newDeviceKey}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(newDeviceKey)}
                  className="ml-2 text-xs text-amber-400 underline"
                >
                  Copy
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setAddOpen(false); setNewDeviceKey(null); }}
                className="rounded border px-4 py-2 text-sm text-white/70"
                style={{ borderColor: COLORS.borderLight }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-white/50">Loading devices…</p>
      ) : devices.length === 0 ? (
        <div className="rounded-lg border p-6" style={panelStyle}>
          <p className="text-sm text-white/50">No devices yet. Add one above and configure it on your mini PC.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((d) => (
            <div key={d.id} className="rounded-lg border p-4" style={panelStyle}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-white">{d.name}</span>
                  <span className="ml-2 text-xs text-white/50">store: {d.storeId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs"
                    style={{
                      background: d.lastSeenAt ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.3)",
                      color: d.lastSeenAt ? "#22c55e" : "#9ca3af",
                    }}
                  >
                    {d.lastSeenAt ? "Online" : "Offline"}
                  </span>
                  {d.posVersion && (
                    <span className="text-xs text-white/50">v{d.posVersion}</span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-white/50">
                Last seen: {formatLastSeen(d.lastSeenAt)}
                {d.deviceKeyPreview && ` • Key: ${d.deviceKeyPreview}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50">Send command:</span>
                {(["FORCE_SYNC", "UPDATE_POS", "RESTART_POS"] as const).map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => handleCommand(d.id, cmd)}
                    disabled={!!commandLoading}
                    className="rounded border px-2 py-1 text-xs transition hover:bg-white/5 disabled:opacity-50"
                    style={{ borderColor: COLORS.borderLight, color: "white" }}
                  >
                    {commandLoading === d.id ? "…" : cmd.replace(/_/g, " ")}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="ml-auto rounded border border-red-500/50 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
              {d.recentCommands.length > 0 && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: COLORS.borderLight }}>
                  <p className="mb-1 text-xs font-medium text-white/70">Recent commands</p>
                  <ul className="space-y-1 text-xs text-white/50">
                    {d.recentCommands.map((c) => (
                      <li key={c.id}>
                        {c.type} → {c.status}
                        {c.errorMessage && ` (${c.errorMessage})`}
                        {" • "}
                        {new Date(c.createdAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
