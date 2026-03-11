"use client";

import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/theme";

const HEALTH_POLL_MS = 2000;

export default function HealthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (res.ok && data?.backend === "ok") {
        setReady(true);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setInterval> | null = null;
    (async () => {
      if (await check()) return;
      t = setInterval(async () => {
        if (cancelled) return;
        if (await check() && t) clearInterval(t);
      }, HEALTH_POLL_MS);
    })();
    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [check]);

  if (ready) return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.bgDarkest,
        color: COLORS.textPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 9999,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600 }}>Starting POS…</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary }}>
        Connecting to server
      </div>
    </div>
  );
}
