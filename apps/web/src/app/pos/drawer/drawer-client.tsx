"use client";

import { useState, useRef } from "react";
import { COLORS } from "@/lib/theme";

type DrawerReason = "GIVE_CHANGE" | "EXCHANGE_BILLS" | "CASH_DROP" | "OTHER";

export default function DrawerClient() {
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
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
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid #e5e5e5",
        }}
      >
        <h1 style={{ margin: "0 0 24px 0", fontSize: 22, fontWeight: 600, color: "#1a1a1a" }}>
          Open Cash Drawer
        </h1>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "#fef2f2",
              border: "1px solid #ef4444",
              borderRadius: 6,
              color: "#991b1b",
            }}
          >
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: 12,
                fontSize: 12,
                padding: "4px 8px",
                background: "#fff",
                color: "#991b1b",
                border: "1px solid #ef4444",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
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
              background: "#22c55e",
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
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#333" }}>
            Select Reason
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {reasons.map((reason) => (
              <button
                key={reason.value}
                type="button"
                onClick={() => setSelectedReason(reason.value)}
                style={{
                  padding: 16,
                  textAlign: "left",
                  border: `2px solid ${selectedReason === reason.value ? COLORS.primary : "#e5e5e5"}`,
                  borderRadius: 8,
                  background: selectedReason === reason.value ? COLORS.primaryLight : "#fafafa",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: "#1a1a1a",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: "#1a1a1a" }}>
                  {reason.label}
                </div>
                <div style={{ fontSize: 13, color: "#555" }}>{reason.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="drawer-note"
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#333",
              fontSize: 16,
              cursor: "pointer",
            }}
            onClick={() => {
              noteInputRef.current?.focus();
            }}
          >
            Note (optional{selectedReason === "OTHER" ? ", required for Other" : ""})
          </label>
          <textarea
            ref={noteInputRef}
            id="drawer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter additional details..."
            rows={3}
            inputMode="text"
            autoComplete="off"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              minHeight: 80,
              border: "2px solid #e5e5e5",
              borderRadius: 6,
              fontFamily: "inherit",
              background: "#fff",
              color: "#1a1a1a",
              resize: "vertical",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleOpenDrawer}
          disabled={!selectedReason || busy}
          style={{
            padding: "16px 32px",
            fontSize: 18,
            fontWeight: "bold",
            background: !selectedReason || busy ? "#d1d5db" : COLORS.primary,
            color: !selectedReason || busy ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: 8,
            cursor: !selectedReason || busy ? "not-allowed" : "pointer",
            boxShadow: !selectedReason || busy ? "none" : "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          {busy ? "Opening Drawer..." : "🔓 Open Drawer"}
        </button>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f9fafb",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#555" }}>Note:</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            Opening the drawer is logged for audit purposes. In a production environment, this would
            trigger the physical cash drawer to open.
          </p>
        </div>
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
