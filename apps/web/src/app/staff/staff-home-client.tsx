"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Camera,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  FileText,
  Trash2,
  Users,
} from "lucide-react";
import { clearActiveStaff, getActiveStaff, withStaffAuthHeaders } from "@/lib/staffAuth";
import { AttendanceClockCard } from "@/components/staff/AttendanceClockCard";

const staffTileBaseClass =
  "flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-4 text-center shadow-md transition-transform duration-150 hover:bg-zinc-700 active:scale-95";

function StaffActionTileLink({
  href,
  icon: Icon,
  label,
  className = "",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`${staffTileBaseClass} ${className}`.trim()}>
      <Icon className="h-8 w-8 shrink-0 text-white/90" strokeWidth={1.75} aria-hidden />
      <span className="text-center text-sm font-medium leading-tight text-white">{label}</span>
    </Link>
  );
}

/**
 * Max units on the incentive progress scale (until API returns a per-store goal).
 * Display uses `monthlyIncentiveTotal / STAFF_INCENTIVE_TRACKING_CAP`.
 */
const STAFF_INCENTIVE_TRACKING_CAP = 2000;

/** While quota is locked, bar fill cannot exceed this amount on the same scale as the tracking cap. */
const STAFF_QUOTA_LOCKED_INCENTIVE_CEILING = 1000;

/** Left portion of bar: green + light “available”; right: dark “rest of scale” */
const INCENTIVE_BAR_ACTIVE_RATIO = 0.62;

type AttEvent = {
  id: string;
  eventType: string;
  happenedAt: string;
  selfieLocalPath: string | null;
};

function sumMonthlyIncentiveTotalFromLedger(entries: Array<{ amount: string; happenedAt: string }>): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let total = 0;
  for (const e of entries) {
    const d = new Date(e.happenedAt);
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;
    const n = parseFloat(String(e.amount).replace(/,/g, ""));
    if (Number.isFinite(n)) total += n;
  }
  return Math.max(0, total);
}

function readQuotaUnlockedFromEnv(): boolean {
  return process.env.NEXT_PUBLIC_STAFF_QUOTA_UNLOCKED === "true";
}

function analyzeTodayEvents(events: AttEvent[]) {
  const sorted = [...events].sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
  let completedMinutes = 0;
  let openIn: Date | null = null;
  for (const e of sorted) {
    if (e.eventType === "TIME_IN") {
      openIn = new Date(e.happenedAt);
    } else if (e.eventType === "TIME_OUT" && openIn) {
      completedMinutes += (new Date(e.happenedAt).getTime() - openIn.getTime()) / 60000;
      openIn = null;
    }
  }
  const sessionOpen = openIn ? (Date.now() - openIn.getTime()) / 60000 : 0;
  const totalMinutes = completedMinutes + sessionOpen;
  const last = sorted[sorted.length - 1];
  const expectsOut = last?.eventType === "TIME_IN";
  const expectsIn = !last || last.eventType === "TIME_OUT";

  const lastIn = [...sorted].filter((e) => e.eventType === "TIME_IN").pop();
  const lastOut = [...sorted].filter((e) => e.eventType === "TIME_OUT").pop();

  return {
    totalMinutes,
    expectsIn,
    expectsOut,
    last,
    lastIn,
    lastOut,
    sorted,
  };
}

function formatTime(d: string): string {
  try {
    return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatTime12h(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export default function StaffHomeClient() {
  const router = useRouter();
  const [staff, setStaff] = useState<ReturnType<typeof getActiveStaff>>(null);
  const [events, setEvents] = useState<AttEvent[]>([]);
  const [message, setMessage] = useState("");
  const [monthlyIncentiveTotal, setMonthlyIncentiveTotal] = useState(0);
  const quotaUnlocked = readQuotaUnlockedFromEnv();
  const [busy, setBusy] = useState(false);
  const [previewIn, setPreviewIn] = useState<string | null>(null);
  const [previewOut, setPreviewOut] = useState<string | null>(null);
  const [inSelfieBlob, setInSelfieBlob] = useState<string | null>(null);
  const [outSelfieBlob, setOutSelfieBlob] = useState<string | null>(null);

  const inFileRef = useRef<HTMLInputElement>(null);
  const outFileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const role = (staff?.role ?? "").toUpperCase();
  const canManagerView =
    role === "MANAGER" || role === "ADMIN" || role === "AUDITOR" || role === "OWNER";

  const loadToday = useCallback(() => {
    fetch("/api/staff/attendance/me/today", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    setStaff(getActiveStaff());
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    fetch("/api/staff/incentives/me", { headers: withStaffAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setMonthlyIncentiveTotal(sumMonthlyIncentiveTotalFromLedger(d));
      })
      .catch(() => setMonthlyIncentiveTotal(0));
  }, []);

  const stats = useMemo(() => analyzeTodayEvents(events), [events]);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    async function go() {
      if (previewIn) {
        setInSelfieBlob(null);
        return;
      }
      const row = stats.lastIn;
      if (!row?.id || !row.selfieLocalPath) {
        setInSelfieBlob(null);
        return;
      }
      const r = await fetch(`/api/staff/attendance/event/${row.id}/selfie`, {
        headers: withStaffAuthHeaders(),
        cache: "no-store",
      });
      if (cancelled) return;
      if (!r.ok) {
        setInSelfieBlob(null);
        return;
      }
      const blob = await r.blob();
      if (cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setInSelfieBlob(createdUrl);
    }
    void go();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [stats.lastIn?.id, stats.lastIn?.selfieLocalPath, previewIn]);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    async function go() {
      if (previewOut) {
        setOutSelfieBlob(null);
        return;
      }
      const row = stats.lastOut;
      if (!row?.id || !row.selfieLocalPath) {
        setOutSelfieBlob(null);
        return;
      }
      const r = await fetch(`/api/staff/attendance/event/${row.id}/selfie`, {
        headers: withStaffAuthHeaders(),
        cache: "no-store",
      });
      if (cancelled) return;
      if (!r.ok) {
        setOutSelfieBlob(null);
        return;
      }
      const blob = await r.blob();
      if (cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setOutSelfieBlob(createdUrl);
    }
    void go();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [stats.lastOut?.id, stats.lastOut?.selfieLocalPath, previewOut]);

  const submitAttendance = useCallback(
    async (type: "time-in" | "time-out", imageBase64: string) => {
      if (busyRef.current) return;
      setBusy(true);
      busyRef.current = true;
      setMessage("");
      try {
        const res = await fetch(`/api/staff/attendance/${type}`, {
          method: "POST",
          headers: withStaffAuthHeaders(),
          body: JSON.stringify({ imageBase64 }),
        });
        const txt = await res.text();
        if (!res.ok) {
          setMessage(txt || "Request failed");
          return;
        }
        if (type === "time-in") {
          setPreviewIn(imageBase64);
        } else {
          setPreviewOut(imageBase64);
        }
        setMessage(type === "time-in" ? "Time in saved locally." : "Time out saved locally.");
        loadToday();
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [loadToday]
  );

  async function handleFile(kind: "in" | "out", file: File) {
    if (busyRef.current) return;
    const s = statsRef.current;
    const b64 = await fileToBase64(file);
    if (kind === "in") {
      if (!s.expectsIn) return;
      await submitAttendance("time-in", b64);
    } else {
      if (!s.expectsOut) return;
      await submitAttendance("time-out", b64);
    }
  }

  const selfieInDone = !!stats.lastIn?.selfieLocalPath;
  const selfieOutDone = !!stats.lastOut?.selfieLocalPath;

  const incentiveForBarFill = quotaUnlocked
    ? monthlyIncentiveTotal
    : Math.min(monthlyIncentiveTotal, STAFF_QUOTA_LOCKED_INCENTIVE_CEILING);
  const barFillPercentWithinActive = Math.min(
    100,
    Math.max(0, (incentiveForBarFill / STAFF_INCENTIVE_TRACKING_CAP) * 100)
  );

  const sectionHeadingClass = "mb-4 text-xs font-semibold uppercase tracking-wider text-white/50";

  return (
    <main className="relative mx-auto flex min-h-full max-w-lg flex-col gap-10 px-4 py-5 pb-36 text-white">
      {/* Visually hidden file pickers (not display:none — mobile Safari still needs .click() to work) */}
      <input
        ref={inFileRef}
        type="file"
        accept="image/*"
        capture="user"
        tabIndex={-1}
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "1px",
          height: "1px",
          opacity: 0,
          overflow: "hidden",
        }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile("in", f);
        }}
      />
      <input
        ref={outFileRef}
        type="file"
        accept="image/*"
        capture="user"
        tabIndex={-1}
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "1px",
          height: "1px",
          opacity: 0,
          overflow: "hidden",
        }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile("out", f);
        }}
      />

      {/* A — Identity row: avatar + name + log out */}
      <header className="flex items-center gap-4">
        <div
          className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-white shadow-inner ring-2 ring-white/30"
          aria-hidden
        >
          <span className="text-3xl leading-none text-violet-500/90">👤</span>
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="truncate text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
            {staff?.name ?? "Staff"}
          </h1>
          <p className="mt-1.5 truncate text-sm font-medium uppercase tracking-wide text-white/75">
            {staff?.role ?? ""}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 self-center rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/85 hover:bg-white/10"
          onClick={() => {
            clearActiveStaff();
            router.replace("/staff/login");
          }}
        >
          Log out
        </button>
      </header>

      {/* B — Incentive progress + quota bar (tap to open incentives) */}
      <section>
        <button
          type="button"
          className="ml-2 w-[calc(100%-0.5rem)] cursor-pointer rounded-2xl border border-zinc-700 bg-zinc-900/50 p-4 text-left shadow-md transition-transform duration-150 hover:bg-zinc-800 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/35"
          onClick={() => router.push("/staff/incentives")}
          aria-label="Open incentives — view progress details"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-4 text-right">
                <p className="text-lg font-semibold tabular-nums tracking-tight text-white">
                  {Math.round(monthlyIncentiveTotal)} / {STAFF_INCENTIVE_TRACKING_CAP}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Incentive progress
                </p>
              </div>
              <div
                className="flex h-4 w-full overflow-hidden rounded-sm shadow-inner ring-1 ring-black/30"
                role="progressbar"
                aria-valuenow={incentiveForBarFill}
                aria-valuemin={0}
                aria-valuemax={STAFF_INCENTIVE_TRACKING_CAP}
                aria-label="Incentive progress"
              >
                <div className="flex min-w-0" style={{ width: `${INCENTIVE_BAR_ACTIVE_RATIO * 100}%` }}>
                  <div
                    className="h-full shrink-0 bg-[#22c55e] transition-[width] duration-300"
                    style={{ width: `${barFillPercentWithinActive}%` }}
                  />
                  <div className="h-full min-w-0 flex-1 bg-neutral-200/90" />
                </div>
                <div
                  className="h-full bg-zinc-800"
                  style={{ width: `${(1 - INCENTIVE_BAR_ACTIVE_RATIO) * 100}%` }}
                />
              </div>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                {quotaUnlocked ? "Quota unlocked" : "quota locked"}
              </p>
            </div>
            <ChevronRight
              className="h-6 w-6 shrink-0 text-white/45"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </button>
      </section>

      {/* C + D — Attendance (kiosk circles + selfie row) */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Camera className="h-4 w-4 shrink-0 text-white/50" strokeWidth={2} aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Attendance</h2>
        </div>
        <AttendanceClockCard
          variant="kioskDark"
          staffName={staff?.name ?? ""}
          workedLabel=""
          selfieInSrc={previewIn ?? inSelfieBlob}
          selfieOutSrc={previewOut ?? outSelfieBlob}
          selfieInTime12h={stats.lastIn ? formatTime12h(stats.lastIn.happenedAt) : null}
          selfieOutTime12h={stats.lastOut ? formatTime12h(stats.lastOut.happenedAt) : null}
          selfieInDone={selfieInDone}
          selfieOutDone={selfieOutDone}
          inDisabled={!stats.expectsIn}
          outDisabled={!stats.expectsOut}
          busy={busy}
          interactive
          onInClick={() => {
            if (stats.expectsIn && !busy) inFileRef.current?.click();
          }}
          onOutClick={() => {
            if (stats.expectsOut && !busy) outFileRef.current?.click();
          }}
        />
        {stats.sorted.length > 0 && (
          <details className="mt-8 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55">
            <summary className="cursor-pointer font-medium text-white/70">Today&apos;s log</summary>
            <ul className="mt-2 space-y-1 pl-1">
              {stats.sorted.map((e) => (
                <li key={e.id}>
                  {e.eventType === "TIME_IN" ? "In" : "Out"} · {formatTime(e.happenedAt)}
                  {e.selfieLocalPath ? " · photo" : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* E — TODOS */}
      <section>
        <h2 className={sectionHeadingClass}>TODOS</h2>
        <div className="grid grid-cols-2 gap-4">
          <StaffActionTileLink href="/staff/count" icon={ClipboardList} label="Inventory count" />
          <StaffActionTileLink href="/staff/sop" icon={CheckSquare} label="SOP checklist" />
        </div>
      </section>

      {/* F — OTHERS */}
      <section>
        <h2 className={sectionHeadingClass}>OTHERS</h2>
        <div className="flex flex-col gap-4">
          <StaffActionTileLink href="/staff/waste" icon={Trash2} label="Report waste" className="w-full" />
          <StaffActionTileLink href="/staff/stock" icon={ClipboardList} label="Stock movements" className="w-full" />
        </div>
      </section>

      {canManagerView && (
        <section className="border-t border-zinc-700 pt-10">
          <h2 className={sectionHeadingClass}>Manager</h2>
          <div className="grid grid-cols-2 gap-4">
            <StaffActionTileLink href="/staff/manager" icon={Users} label="Team overview" />
            <StaffActionTileLink href="/staff/manager#shifts" icon={Calendar} label="Schedules / shifts" />
            <StaffActionTileLink href="/staff/manager#reports" icon={FileText} label="Reports" />
          </div>
        </section>
      )}

      {message && <p className="text-center text-sm text-emerald-400">{message}</p>}
    </main>
  );
}
