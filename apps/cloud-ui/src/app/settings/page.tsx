"use client";

import { COLORS } from "@/lib/theme";

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: COLORS.bgDark, color: "#ddd" }}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-semibold text-white">Settings</h1>
        <div
          className="rounded-lg border p-6"
          style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
        >
          <p className="text-white/70">
            Settings for store identity, sync configuration, and admin preferences will appear here.
          </p>
          <p className="mt-4 text-sm text-white/50">
            For transaction sync, configure <code className="rounded bg-white/10 px-1">CLOUD_URL</code> and{" "}
            <code className="rounded bg-white/10 px-1">STORE_SYNC_SECRET</code> in both POS (apps/api) and Cloud API
            (apps/cloud-api) environments.
          </p>
        </div>
      </div>
    </div>
  );
}
