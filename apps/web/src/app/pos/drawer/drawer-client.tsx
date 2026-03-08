"use client";

import { useState } from "react";
import { COLORS } from "@/lib/theme";

type DrawerReason = "GIVE_CHANGE" | "EXCHANGE_BILLS" | "CASH_DROP" | "OTHER";

export default function DrawerClient() {
  const [selectedReason, setSelectedReason] = useState<DrawerReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const reasons: Array<{ value: DrawerReason; label: string; description: string }> = [
    { value: "GIVE_CHANGE", label: "Give Change", description: "Providing change to customer" },
    { value: "EXCHANGE_BILLS", label: "Exchange Bills", description: "Breaking large bills or exchanging denominations" },
    { value: "CASH_DROP", label: "Cash Drop", description: "Removing excess cash from drawer" },
    { value: "OTHER", label: "Other", description: "Other reason (please specify in note)" },
  ];

  async function handleOpenDrawer() {
    if (!selectedReason) {
      setError("Please select a reason");
      return;
    }

    if (selectedReason === "OTHER" && !note.trim()) {
      setError("Please provide a note for 'Other' reason");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/drawer/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open drawer");
        return;
      }

      // Show success toast
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reset form
      setSelectedReason(null);
      setNote("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 24 }}>Open Cash Drawer</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", border: "1px solid #c00", borderRadius: 4 }}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, fontSize: 12 }}>
            Dismiss
          </button>
        </div>
      )}

      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 70,
            right: 20,
            padding: 16,
            background: "#28a745",
            color: "#fff",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 1000,
            fontWeight: "bold",
            animation: "slideIn 0.3s ease-out",
          }}
        >
          ✓ Drawer opened successfully
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Select Reason</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {reasons.map((reason) => (
            <button
              key={reason.value}
              onClick={() => setSelectedReason(reason.value)}
              style={{
                padding: 16,
                textAlign: "left",
                border: `2px solid ${selectedReason === reason.value ? COLORS.primary : "#ddd"}`,
                borderRadius: 8,
                background: selectedReason === reason.value ? COLORS.primaryLight : "#fff",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>{reason.label}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{reason.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          Note (optional{selectedReason === "OTHER" ? ", required for Other" : ""})
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter additional details..."
          rows={3}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 14,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontFamily: "inherit",
          }}
        />
      </div>

      <button
        onClick={handleOpenDrawer}
        disabled={!selectedReason || busy}
        style={{
          padding: "16px 32px",
          fontSize: 18,
          fontWeight: "bold",
          background: !selectedReason || busy ? "#ccc" : COLORS.primary,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: !selectedReason || busy ? "not-allowed" : "pointer",
          boxShadow: !selectedReason || busy ? "none" : "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {busy ? "Opening Drawer..." : "🔓 Open Drawer"}
      </button>

      <div style={{ marginTop: 32, padding: 16, background: "#f9f9f9", borderRadius: 4, border: "1px solid #ddd" }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: "#666" }}>Note:</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
          Opening the drawer is logged for audit purposes. In a production environment, this would trigger the
          physical cash drawer to open.
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
