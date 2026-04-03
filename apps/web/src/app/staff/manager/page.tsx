"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveStaff, withStaffAuthHeaders } from "@/lib/staffAuth";
import { AttendanceClockCard } from "@/components/staff/AttendanceClockCard";

type AttEvent = {
  id: string;
  staffName: string;
  eventType: string;
  happenedAt: string;
  selfieLocalPath: string | null;
};

function formatWorked(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`;
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
  return { totalMinutes, expectsIn, expectsOut, last, lastIn, lastOut, sorted };
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

export default function StaffManagerPage() {
  const [overview, setOverview] = useState<unknown>(null);
  const [teamEvents, setTeamEvents] = useState<AttEvent[]>([]);
  const [shifts, setShifts] = useState<unknown[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const role = (getActiveStaff()?.role ?? "").toUpperCase();
  const allowed =
    role === "MANAGER" || role === "ADMIN" || role === "AUDITOR" || role === "OWNER";

  useEffect(() => {
    if (!allowed) {
      setForbidden(true);
      return;
    }
    const headers = withStaffAuthHeaders();
    fetch("/api/staff/manager/overview", { headers, cache: "no-store" })
      .then((r) => {
        if (r.status === 403) setForbidden(true);
        return r.json();
      })
      .then(setOverview)
      .catch(() => setOverview({ error: "Failed to load" }));

    fetch("/api/staff/attendance/store/today", { headers, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTeamEvents(Array.isArray(d) ? d : []))
      .catch(() => setTeamEvents([]));

    fetch("/api/staff/shifts/store", { headers, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setShifts(Array.isArray(d) ? d : []))
      .catch(() => setShifts([]));
  }, [allowed]);

  const byStaff = useMemo(() => {
    const m = new Map<string, AttEvent[]>();
    for (const e of teamEvents) {
      const name = e.staffName || "Unknown";
      if (!m.has(name)) m.set(name, []);
      m.get(name)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [teamEvents]);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4 text-white sm:px-5 sm:pt-5">
      {forbidden ? (
        <p className="text-base text-white/55">You don&apos;t have manager or auditor access.</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
              Team attendance today
            </h2>
            <div className="space-y-5">
              {byStaff.length === 0 && (
                <p className="text-base text-white/45">No attendance events yet today.</p>
              )}
              {byStaff.map(([name, evs]) => {
                const s = analyzeTodayEvents(evs);
                const lastActionLabel = s.last
                  ? `Last: ${s.last.eventType === "TIME_IN" ? "Time in" : "Time out"} ${formatTime(s.last.happenedAt)}`
                  : undefined;
                return (
                  <AttendanceClockCard
                    key={name}
                    staffName={name}
                    workedLabel={formatWorked(s.totalMinutes)}
                    lastActionLabel={lastActionLabel}
                    selfieInTime12h={s.lastIn ? formatTime12h(s.lastIn.happenedAt) : null}
                    selfieOutTime12h={s.lastOut ? formatTime12h(s.lastOut.happenedAt) : null}
                    selfieInDone={!!s.lastIn?.selfieLocalPath}
                    selfieOutDone={!!s.lastOut?.selfieLocalPath}
                    inDisabled={false}
                    outDisabled={false}
                    busy={false}
                    interactive={false}
                    readOnly
                    onInClick={() => {}}
                    onOutClick={() => {}}
                  />
                );
              })}
            </div>
          </section>

          <section id="shifts" className="mb-10 scroll-mt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/50">Schedules / shifts</h2>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <pre className="max-h-52 overflow-auto text-xs leading-relaxed text-white/70">
                {JSON.stringify(shifts.slice(0, 40), null, 2)}
              </pre>
            </div>
          </section>

          <section id="reports" className="scroll-mt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
              Reports & recent activity
            </h2>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <pre className="max-h-72 overflow-auto text-xs leading-relaxed text-white/70">
                {JSON.stringify(overview, null, 2)}
              </pre>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
