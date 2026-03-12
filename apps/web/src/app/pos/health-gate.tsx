"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { COLORS } from "@/lib/theme";

const POLL_MS = 2000;
const WATCHDOG_MS = 30000; // re-check when ready to detect API loss

type GateState = "reconnecting" | "maintenance" | "ready";
type SystemStatus = {
  runtimeStatus: string;
  db: string;
  sync?: { status: string; lastError?: string | null };
  commandState?: string;
  errorMessage?: string | null;
};

function getMessage(state: GateState, commandState?: string, errorMessage?: string | null) {
  if (state === "reconnecting") {
    return { title: "Reconnecting…", sub: "Connecting to server" };
  }
  if (state === "maintenance") {
    const titles: Record<string, string> = {
      updating: "Updating POS…",
      restarting: "Restarting…",
      syncing: "Syncing…",
    };
    return {
      title: titles[commandState ?? ""] ?? "Maintenance in progress…",
      sub: "Please wait",
    };
  }
  if (commandState === "failed" && errorMessage) {
    return { title: "Update failed", sub: errorMessage };
  }
  return { title: "Starting POS…", sub: "Connecting to server" };
}

export default function HealthGate({ children }: { children: React.ReactNode }) {
  const [gateState, setGateState] = useState<GateState>("reconnecting");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const commandState = systemStatus?.commandState ?? "idle";
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/system/status", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (!res.ok || !data) {
        setGateState("reconnecting");
        setSystemStatus(null);
        return false;
      }

      setSystemStatus(data);
      setErrorMessage(data.errorMessage ?? null);

      if (
        data.runtimeStatus === "updating" ||
        data.runtimeStatus === "restarting" ||
        data.commandState === "syncing"
      ) {
        setGateState("maintenance");
        return false;
      }

      setGateState("ready");
      return true;
    } catch {
      setGateState("reconnecting");
      setSystemStatus(null);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    (async () => {
      if (await check()) return;
      pollId = setInterval(async () => {
        if (cancelled) return;
        await check();
      }, POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [check]);

  useEffect(() => {
    if (gateState !== "ready") return;
    watchdogRef.current = setInterval(check, WATCHDOG_MS);
    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [gateState, check]);

  if (gateState === "ready") {
    return (
      <HealthGateReady systemStatus={systemStatus}>
        {children}
      </HealthGateReady>
    );
  }

  const { title, sub } = getMessage(gateState, commandState, errorMessage);
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
      <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary }}>{sub}</div>
    </div>
  );
}

function HealthGateReady({
  children,
  systemStatus,
}: {
  children: React.ReactNode;
  systemStatus: SystemStatus | null;
}) {
  const degraded = systemStatus?.runtimeStatus === "degraded";
  if (!degraded) return <>{children}</>;

  const msg =
    systemStatus?.sync?.lastError ||
    systemStatus?.errorMessage ||
    "Some services are degraded. POS remains usable.";

  return (
    <>
      <div
        style={{
          padding: "8px 16px",
          background: COLORS.warning,
          color: "#000",
          fontSize: 13,
          textAlign: "center",
          zIndex: 9998,
        }}
      >
        ⚠ {msg}
      </div>
      {children}
    </>
  );
}
