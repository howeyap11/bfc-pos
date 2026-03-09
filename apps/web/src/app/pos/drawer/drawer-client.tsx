"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";

type DrawerReason = "GIVE_CHANGE" | "EXCHANGE_BILLS" | "CASH_DROP" | "OTHER";

export default function DrawerClient() {
  const router = useRouter();
  const keyboard = useOnScreenKeyboard();
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; staffKey: string } | null>(null);
  const [selectedReason, setSelectedReason] = useState<DrawerReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bfc_active_staff");
      if (stored) {
        const staff = JSON.parse(stored);
        if (staff?.staffKey) setActiveStaff(staff);
      }
    } catch (e) {
      console.error("[Drawer] Failed to load active staff", e);
    }
  }, []);

  const reasons: Array<{ value: DrawerReason; label: string; description: string }> = [
    { value: "GIVE_CHANGE", label: "Give Change", description: "Providing change to customer" },
    { value: "EXCHANGE_BILLS", label: "Exchange Bills", description: "Breaking large bills or exchanging denominations" },
    { value: "CASH_DROP", label: "Cash Drop", description: "Removing excess cash from drawer" },
    { value: "OTHER", label: "Other", description: "Other reason (please specify in note)" },
  ];

  async function handleOpenDrawer() {
    if (!activeStaff?.staffKey) {
      setError("No active staff session. Please login from the Register page first.");
      return;
    }
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
        headers: {
          "content-type": "application/json",
          "x-staff-key": activeStaff.staffKey,
        },
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

  function openNoteKeyboard() {
    keyboard.openKeyboard({
      mode: "text",
      value: note,
      title: "Note (optional)",
      onDone: (val) => {
        setNote(val);
        keyboard.closeKeyboard();
      },
      onChange: (val) => setNote(val),
    });
  }

  if (!activeStaff?.staffKey) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          background: COLORS.bgDarkest,
        }}
      >
        <div
          style={{
            background: COLORS.bgDark,
            padding: 32,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 20, color: COLORS.textPrimary }}>
            Staff Login Required
          </h2>
          <p style={{ margin: "0 0 24px 0", fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.5 }}>
            No active staff session. Please login from the Register page first.
          </p>
          <button
            type="button"
            onClick={() => router.push("/pos/register")}
            style={{
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: "600",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", background: COLORS.bgDarkest, minHeight: "100%" }}>
      <div
        style={{
          background: COLORS.bgDark,
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <h1 style={{ margin: "0 0 24px 0", fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>
          Open Cash Drawer
        </h1>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "#7f1d1d",
              border: "1px solid #ef4444",
              borderRadius: 6,
              color: "#fecaca",
            }}
          >
            <strong>Error:</strong> {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                marginLeft: 12,
                fontSize: 12,
                padding: "4px 8px",
                background: "transparent",
                color: "#fca5a5",
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
              background: COLORS.success,
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
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: COLORS.textSecondary }}>
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
                  border: `2px solid ${selectedReason === reason.value ? COLORS.primary : COLORS.borderLight}`,
                  borderRadius: 8,
                  background: selectedReason === reason.value ? COLORS.primaryLight : COLORS.bgPanel,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: COLORS.textPrimary,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: COLORS.textPrimary }}>
                  {reason.label}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{reason.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: COLORS.textSecondary,
              fontSize: 16,
            }}
          >
            Note (optional{selectedReason === "OTHER" ? ", required for Other" : ""})
          </label>
          <button
            type="button"
            onClick={openNoteKeyboard}
            style={{
              width: "100%",
              minHeight: 80,
              padding: 12,
              textAlign: "left",
              fontSize: 16,
              border: `2px solid ${COLORS.borderLight}`,
              borderRadius: 6,
              fontFamily: "inherit",
              background: COLORS.bgPanel,
              color: note ? COLORS.textPrimary : COLORS.textMuted,
              cursor: "pointer",
            }}
          >
            {note || "Tap to enter note..."}
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenDrawer}
          disabled={!selectedReason || busy}
          style={{
            padding: "16px 32px",
            fontSize: 18,
            fontWeight: "bold",
            background: !selectedReason || busy ? COLORS.bgPanel : COLORS.primary,
            color: !selectedReason || busy ? COLORS.textMuted : "#fff",
            border: "none",
            borderRadius: 8,
            cursor: !selectedReason || busy ? "not-allowed" : "pointer",
            boxShadow: !selectedReason || busy ? "none" : "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {busy ? "Opening Drawer..." : "🔓 Open Drawer"}
        </button>
      </div>

      {keyboard.isOpen && (
        <OnScreenKeyboard
          isOpen={keyboard.isOpen}
          mode={keyboard.mode}
          value={keyboard.value}
          title={keyboard.title}
          onClose={keyboard.closeKeyboard}
          onValueChange={keyboard.updateValue}
          onDone={keyboard.handleDone}
        />
      )}

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
