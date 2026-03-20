"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { COLORS } from "@/lib/theme";

const POLL_BASE_MS = 2000;
const POLL_MAX_MS = 30000;
const WATCHDOG_MS = 30000;
/** Brief API / network blips should not flash reconnect UI (3–5s). */
const DISCONNECT_UI_DEBOUNCE_MS = 4000;
const FETCH_TIMEOUT_MS = 15000;

type GateState = "reconnecting" | "maintenance" | "ready";
type SystemStatus = {
  runtimeStatus: string;
  db: string;
  sync?: { status: string; lastError?: string | null };
  commandState?: string;
  errorMessage?: string | null;
};

function classifyFetchError(e: unknown): { kind: string; message: string } {
  if (e instanceof Error) {
    if (e.name === "AbortError") return { kind: "timeout", message: e.message };
    if (e.name === "TypeError") return { kind: "network", message: e.message };
    return { kind: "error", message: e.message };
  }
  return { kind: "unknown", message: String(e) };
}

function getMessage(
  state: GateState,
  commandState?: string,
  errorMessage?: string | null,
  showHarshReconnectCopy?: boolean
) {
  if (state === "reconnecting") {
    if (!showHarshReconnectCopy) {
      return { title: "Starting POS…", sub: "Connecting to server" };
    }
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
  /** After first successful check: transient failures keep UI mounted. */
  const [everReady, setEverReady] = useState(false);
  /** Debounced “harsh” reconnect copy on boot (before first success). */
  const [showBootDisconnectCopy, setShowBootDisconnectCopy] = useState(false);
  /** Debounced soft banner when API drops after we were live. */
  const [softDisconnected, setSoftDisconnected] = useState(false);

  const commandState = systemStatus?.commandState ?? "idle";

  const inFlightRef = useRef(false);
  const pollBackoffRef = useRef(POLL_BASE_MS);
  const everReadyRef = useRef(false);
  const softDisconnectedRef = useRef(false);
  const bootDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const softDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBootDebounce = useCallback(() => {
    if (bootDebounceRef.current) {
      clearTimeout(bootDebounceRef.current);
      bootDebounceRef.current = null;
    }
    setShowBootDisconnectCopy(false);
  }, []);

  const clearSoftDebounce = useCallback(() => {
    if (softDebounceRef.current) {
      clearTimeout(softDebounceRef.current);
      softDebounceRef.current = null;
    }
    setSoftDisconnected(false);
    softDisconnectedRef.current = false;
  }, []);

  const scheduleBootDisconnectCopy = useCallback(() => {
    if (bootDebounceRef.current) return;
    bootDebounceRef.current = setTimeout(() => {
      bootDebounceRef.current = null;
      setShowBootDisconnectCopy(true);
    }, DISCONNECT_UI_DEBOUNCE_MS);
  }, []);

  const scheduleSoftDisconnectBanner = useCallback(() => {
    if (softDebounceRef.current) return;
    softDebounceRef.current = setTimeout(() => {
      softDebounceRef.current = null;
      softDisconnectedRef.current = true;
      setSoftDisconnected(true);
    }, DISCONNECT_UI_DEBOUNCE_MS);
  }, []);

  const check = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/system/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        const bodyPreview = await res.text().catch(() => "");
        console.warn("[HealthGate] /system/status HTTP error", {
          kind: "http",
          status: res.status,
          statusText: res.statusText,
          bodyPreview: bodyPreview.slice(0, 200),
        });
        pollBackoffRef.current = Math.min(
          Math.floor(pollBackoffRef.current * 1.5),
          POLL_MAX_MS
        );
        if (everReadyRef.current) {
          if (!softDebounceRef.current && !softDisconnectedRef.current) {
            scheduleSoftDisconnectBanner();
          }
          setGateState("ready");
        } else {
          setGateState("reconnecting");
          scheduleBootDisconnectCopy();
        }
        return;
      }

      let data: SystemStatus | null = null;
      try {
        data = (await res.json()) as SystemStatus;
      } catch (e) {
        console.warn("[HealthGate] /system/status invalid JSON", classifyFetchError(e));
        pollBackoffRef.current = Math.min(
          Math.floor(pollBackoffRef.current * 1.5),
          POLL_MAX_MS
        );
        if (everReadyRef.current) {
          if (!softDebounceRef.current && !softDisconnectedRef.current) {
            scheduleSoftDisconnectBanner();
          }
          setGateState("ready");
        } else {
          setGateState("reconnecting");
          scheduleBootDisconnectCopy();
        }
        return;
      }

      if (!data) {
        console.warn("[HealthGate] /system/status empty body");
        return;
      }

      // Success — reset backoff and debounced disconnect UI
      pollBackoffRef.current = POLL_BASE_MS;
      clearBootDebounce();
      clearSoftDebounce();

      setSystemStatus(data);
      setErrorMessage(data.errorMessage ?? null);

      if (
        data.runtimeStatus === "updating" ||
        data.runtimeStatus === "restarting" ||
        data.commandState === "syncing"
      ) {
        setGateState("maintenance");
        return;
      }

      everReadyRef.current = true;
      setEverReady(true);
      setGateState("ready");
    } catch (e) {
      const { kind, message } = classifyFetchError(e);
      console.warn("[HealthGate] /system/status fetch failed", { kind, message });
      pollBackoffRef.current = Math.min(
        Math.floor(pollBackoffRef.current * 1.5),
        POLL_MAX_MS
      );
      if (everReadyRef.current) {
        if (!softDebounceRef.current && !softDisconnectedRef.current) {
          scheduleSoftDisconnectBanner();
        }
        setGateState("ready");
      } else {
        setGateState("reconnecting");
        scheduleBootDisconnectCopy();
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [
    clearBootDebounce,
    clearSoftDebounce,
    scheduleBootDisconnectCopy,
    scheduleSoftDisconnectBanner,
  ]);

  // Single poll / watchdog loop (only one timer; inFlight prevents overlapping checks)
  useEffect(() => {
    let cancelled = false;

    const nextDelay = (): number => {
      if (cancelled) return POLL_MAX_MS;
      // Maintenance or still booting: retry with backoff
      if (!everReadyRef.current) return pollBackoffRef.current;
      if (softDisconnectedRef.current) return pollBackoffRef.current;
      return WATCHDOG_MS;
    };

    const loop = async () => {
      if (cancelled) return;
      await check();
      if (cancelled) return;
      const d = nextDelay();
      loopTimerRef.current = setTimeout(loop, d);
    };

    void loop();

    return () => {
      cancelled = true;
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      clearBootDebounce();
      clearSoftDebounce();
    };
  }, [check, clearBootDebounce, clearSoftDebounce]);

  // When we transition to soft disconnect, poll faster again (still one loop — kick a check soon)
  useEffect(() => {
    if (!softDisconnected) return;
    const t = setTimeout(() => {
      void check();
    }, POLL_BASE_MS);
    return () => clearTimeout(t);
  }, [softDisconnected, check]);

  if (gateState === "ready" && everReady) {
    return <HealthGateReady systemStatus={systemStatus}>{children}</HealthGateReady>;
  }

  const { title, sub } = getMessage(
    gateState,
    commandState,
    errorMessage,
    gateState === "reconnecting" ? showBootDisconnectCopy : true
  );

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
}: {
  children: React.ReactNode;
  systemStatus: SystemStatus | null;
}) {
  return <>{children}</>;
}
