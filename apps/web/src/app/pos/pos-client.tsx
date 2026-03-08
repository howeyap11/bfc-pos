"use client";

import { useEffect, useState } from "react";

type RegisterSession = {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openingCash: number;
  closedAt?: string | null;
  closingCash?: number | null;
  expectedCash?: number | null;
  varianceCash?: number | null;
  note?: string | null;
};

export default function PosClient() {
  const [current, setCurrent] = useState<RegisterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [openingCashPesos, setOpeningCashPesos] = useState("");
  const [closingCashPesos, setClosingCashPesos] = useState("");
  const [note, setNote] = useState("");

  async function loadCurrent() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/register/current", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load register");
        return;
      }
      setCurrent(data.current);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrent();
  }, []);

  async function handleOpenRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const pesos = parseFloat(openingCashPesos) || 0;
      const openingCashCents = Math.round(pesos * 100);

      const res = await fetch("/api/register/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ openingCashCents, note: note.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open register");
        return;
      }

      setOpeningCashPesos("");
      setNote("");
      await loadCurrent();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const pesos = parseFloat(closingCashPesos) || 0;
      const closingCashCents = Math.round(pesos * 100);

      const res = await fetch("/api/register/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ closingCashCents, note: note.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to close register");
        return;
      }

      setClosingCashPesos("");
      setNote("");
      await loadCurrent();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function formatPesos(cents: number) {
    return `₱${(cents / 100).toFixed(2)}`;
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>POS Register</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>POS Register</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", border: "1px solid #c00", borderRadius: 4 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {current === null ? (
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 4, maxWidth: 400 }}>
          <h2>Register Closed</h2>
          <p>Open the register to start a new session.</p>

          <form onSubmit={handleOpenRegister}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <strong>Opening Cash (₱)</strong>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingCashPesos}
                onChange={(e) => setOpeningCashPesos(e.target.value)}
                placeholder="0.00"
                required
                disabled={busy}
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <strong>Note (optional)</strong>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Morning shift"
                disabled={busy}
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <button type="submit" disabled={busy} style={{ padding: "10px 20px", fontSize: 16 }}>
              {busy ? "Opening..." : "Open Register"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ border: "1px solid #0a0", padding: 16, borderRadius: 4, maxWidth: 600, background: "#efe" }}>
          <h2 style={{ color: "#060" }}>✓ Register OPEN</h2>

          <div style={{ marginBottom: 16 }}>
            <p>
              <strong>Session ID:</strong> {current.id}
            </p>
            <p>
              <strong>Opened At:</strong> {new Date(current.openedAt).toLocaleString()}
            </p>
            <p>
              <strong>Opening Cash:</strong> {formatPesos(current.openingCash)}
            </p>
            {current.note && (
              <p>
                <strong>Note:</strong> {current.note}
              </p>
            )}
          </div>

          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #ccc" }} />

          <h3>Close Register</h3>
          <form onSubmit={handleCloseRegister}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <strong>Closing Cash Count (₱)</strong>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closingCashPesos}
                onChange={(e) => setClosingCashPesos(e.target.value)}
                placeholder="0.00"
                required
                disabled={busy}
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <strong>Note (optional)</strong>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., End of shift"
                disabled={busy}
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <button type="submit" disabled={busy} style={{ padding: "10px 20px", fontSize: 16 }}>
              {busy ? "Closing..." : "Close Register"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
