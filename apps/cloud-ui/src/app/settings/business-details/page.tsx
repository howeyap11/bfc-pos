"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/theme";
import { api } from "@/lib/api";

export default function BusinessDetailsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    api
      .getStoreConfig()
      .then((config) => {
        setBusinessName(config.businessName ?? "");
        setAddress(config.address ?? "");
      })
      .catch(() => setError("Failed to load business details"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const body = { businessName: businessName.trim() || null, address: address.trim() || null };
    try {
      await api.putStoreConfig(body);
      setSuccess("Saved. Business name and address will appear on receipts.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const bodyErr = err && typeof err === "object" && "body" in err ? (err as { body?: unknown }).body : undefined;
      const serverMsg =
        bodyErr && typeof bodyErr === "object" && "message" in bodyErr && typeof (bodyErr as { message: unknown }).message === "string"
          ? (bodyErr as { message: string }).message
          : bodyErr && typeof bodyErr === "object" && "error" in bodyErr
            ? String((bodyErr as { error: unknown }).error)
            : null;
      // Don't show the old POS_BACKEND/STORE_CONFIG_ADMIN_KEY message; business details save in cloud-api now.
      const isOldProxyMessage =
        typeof serverMsg === "string" &&
        (serverMsg.includes("POS_BACKEND") || serverMsg.includes("STORE_CONFIG_ADMIN_KEY") || serverMsg.includes("business details from Cloud Admin"));
      setError(isOldProxyMessage ? "Failed to save. Please try again." : (serverMsg || "Failed to save"));
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
      {loading && (
        <p className="mb-4 text-sm text-white/60">Loading…</p>
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
              disabled={saving || loading}
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
