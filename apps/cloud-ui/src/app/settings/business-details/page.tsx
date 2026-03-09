"use client";

import { useState } from "react";
import { COLORS } from "@/lib/theme";

export default function BusinessDetailsPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await new Promise((r) => setTimeout(r, 300));
      setSuccess("Saved (placeholder – backend not yet connected)");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Business Details</h1>
      <p className="mb-6 text-sm text-white/60">
        Store identity for receipts and reports.
      </p>
      {success && (
        <div className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-6">
        <div
          className="rounded-lg border p-6"
          style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Store or café name"
                className={inputStyle}
                style={inputBg}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={3}
                className={inputStyle + " resize-none"}
                style={inputBg}
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
