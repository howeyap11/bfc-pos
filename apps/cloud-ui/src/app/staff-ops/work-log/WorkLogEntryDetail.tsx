"use client";

import { useMemo, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type WorkLogEntryLite = {
  kind: string;
  actionType: string;
  detail: Record<string, unknown>;
};

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function imageSrc(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "attendance":
      return "Attendance";
    case "inventory":
      return "Inventory count";
    case "waste":
      return "Waste";
    case "sop":
      return "SOP checklist";
    case "shifts":
      return "Shift";
    case "violations":
      return "Violation";
    case "stock_movements":
      return "Stock movement";
    default:
      return kind || "Event";
  }
}

type InvLine = {
  inventoryItemName?: string;
  actualQuantity?: unknown;
  expectedQuantity?: unknown;
  unit?: string;
  varianceQuantity?: unknown;
  openedAmount?: unknown;
  sealedUnitCount?: unknown;
  sealedBoxCount?: unknown;
  totalAmount?: unknown;
};

function parseChecklistJson(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}

function SopChecklistBody({ data }: { data: unknown }) {
  const rows = useMemo(() => {
    if (data == null) return [];
    if (Array.isArray(data)) {
      return data.map((item, i) => {
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const label = str(o.label ?? o.title ?? o.name ?? o.question ?? `Item ${i + 1}`);
          const ok =
            o.checked === true ||
            o.ok === true ||
            o.pass === true ||
            o.value === true ||
            String(o.status ?? "").toLowerCase() === "pass";
          const note = str(o.notes ?? o.comment ?? o.detail ?? "");
          return { key: `i-${i}`, label, ok, note };
        }
        return { key: `i-${i}`, label: JSON.stringify(item), ok: null as boolean | null, note: "" };
      });
    }
    if (typeof data === "object") {
      return Object.entries(data as Record<string, unknown>).map(([k, v]) => ({
        key: k,
        label: k,
        ok: typeof v === "boolean" ? v : null,
        note: typeof v === "string" || typeof v === "number" ? String(v) : "",
      }));
    }
    return [];
  }, [data]);

  if (rows.length === 0) {
    return <p className="text-sm text-teal-800/70">No checklist items could be parsed from the submission.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-teal-100/80">
      <table className="min-w-full text-sm">
        <thead className="bg-teal-50/80 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-center">Result</th>
            <th className="px-3 py-2">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-teal-100/80 bg-white">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2 font-medium text-teal-950">{r.label}</td>
              <td className="px-3 py-2 text-center">
                {r.ok === true ? (
                  <span className="text-emerald-700">Pass</span>
                ) : r.ok === false ? (
                  <span className="text-red-600">Fail</span>
                ) : (
                  <span className="text-teal-700/60">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-teal-900/75">{r.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkLogEntryDetail({ entry }: { entry: WorkLogEntryLite }) {
  const d = entry.detail;

  const section = (title: string, children: ReactNode) => (
    <section className="mb-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800/60">{title}</h4>
      {children}
    </section>
  );

  const dlRow = (label: string, value: string | ReactNode) => (
    <div className="flex flex-col gap-0.5 border-b border-teal-100/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium text-teal-800/70">{label}</dt>
      <dd className="min-w-0 text-sm text-teal-950">{value}</dd>
    </div>
  );

  if (entry.kind === "attendance") {
    const selfie = imageSrc(str(d.selfieUrl));
    return (
      <>
        {section(
          "Clock event",
          <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
            {dlRow("Event", str(d.eventType).replace("_", " ") || "—")}
            {dlRow("Staff", str(d.staffName) || "—")}
            {dlRow("Role", str(d.staffRole) || "—")}
            {dlRow("Staff ID", str(d.staffCloudId) || "—")}
          </dl>
        )}
        {selfie ? (
          <section className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800/60">Selfie</h4>
            <img src={selfie} alt="" className="max-h-48 rounded-xl border border-teal-100 object-contain" />
          </section>
        ) : null}
      </>
    );
  }

  if (entry.kind === "waste") {
    const img = imageSrc(typeof d.imageUrl === "string" ? d.imageUrl : null);
    return (
      <>
        {section(
          "Report",
          <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
            {dlRow("Item", str(d.inventoryItemName) || "—")}
            {dlRow("Type", str(d.itemType) || "—")}
            {dlRow(
              "Quantity",
              `${formatQty(parseNum(d.quantity))}${str(d.unit) ? ` ${str(d.unit)}` : ""}`
            )}
            {dlRow("Reason", str(d.reason) || "—")}
            {dlRow("Notes", str(d.notes) || "—")}
          </dl>
        )}
        {img ? (
          <section className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800/60">Photo</h4>
            <img src={img} alt="" className="max-h-48 rounded-xl border border-teal-100 object-contain" />
          </section>
        ) : null}
      </>
    );
  }

  if (entry.kind === "inventory") {
    const lines = Array.isArray(d.lines) ? (d.lines as InvLine[]) : [];
    return (
      <>
        {section(
          "Session",
          <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
            {dlRow("Shift", str(d.shiftType) || "—")}
            {dlRow("Source", str(d.source) || "—")}
            {dlRow("Submitted by", str(d.submittedByStaffName) || "—")}
            {dlRow("Lines", String(lines.length))}
          </dl>
        )}
        {lines.length > 0
          ? section(
              "Count lines",
              <div className="overflow-x-auto rounded-xl border border-teal-100/80">
                <table className="min-w-full text-sm">
                  <thead className="bg-teal-50/80 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                    <tr>
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2 text-right">Staff count</th>
                      <th className="px-2 py-2 text-right">Baseline store</th>
                      <th className="px-2 py-2">Unit</th>
                      <th className="px-2 py-2 text-right">Breakdown</th>
                      <th className="px-2 py-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-100/80 bg-white">
                    {lines.map((l, i) => {
                      const name = str(l.inventoryItemName) || "—";
                      const staffCount = (() => {
                        const t = parseNum(l.totalAmount);
                        if (Number.isFinite(t)) return t;
                        return parseNum(l.actualQuantity);
                      })();
                      const baseline = parseNum(l.expectedQuantity);
                      const varq = parseNum(l.varianceQuantity);
                      const variance = Number.isFinite(varq)
                        ? varq
                        : Number.isFinite(staffCount) && Number.isFinite(baseline)
                          ? staffCount - baseline
                          : NaN;
                      const o = str(l.openedAmount);
                      const su = str(l.sealedUnitCount);
                      const sb = str(l.sealedBoxCount);
                      const hasBreakdown = !!(o || su || sb);
                      const br = hasBreakdown
                        ? [o ? `opened ${o}` : null, su ? `units ${su}` : null, sb ? `boxes ${sb}` : null]
                            .filter(Boolean)
                            .join(" · ")
                        : "—";
                      return (
                        <tr key={`${name}-${i}`}>
                          <td className="px-2 py-2 font-medium text-teal-950">{name}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatQty(staffCount)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatQty(baseline)}</td>
                          <td className="px-2 py-2 text-teal-900/70">{str(l.unit) || "—"}</td>
                          <td className="px-2 py-2 text-right text-xs text-teal-900/80">{br}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-teal-950">{formatQty(variance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          : section("Count lines", <p className="text-sm text-teal-800/70">No lines on this session.</p>)}
      </>
    );
  }

  if (entry.kind === "sop") {
    const raw = d.checklistResultJson;
    const hasRaw = typeof raw === "string" && raw.trim().length > 0;
    const parsed = hasRaw ? parseChecklistJson(raw) : null;
    const sum = d.checklistSummary;
    const itemCount =
      sum && typeof sum === "object" && "checklistItemCount" in sum
        ? parseNum((sum as { checklistItemCount?: unknown }).checklistItemCount)
        : NaN;
    const completedCount =
      sum && typeof sum === "object" && "checklistCompletedCount" in sum
        ? parseNum((sum as { checklistCompletedCount?: unknown }).checklistCompletedCount)
        : NaN;
    return (
      <>
        {section(
          "Submission",
          <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
            {dlRow("Template", str(d.templateName) || "—")}
            {dlRow("Version", str(d.templateVersion) || "—")}
            {dlRow("Shift", str(d.shiftType) || "—")}
            {dlRow("Notes", str(d.notes) || "—")}
            {dlRow("Assigned shift ID", str(d.assignedShiftId) || "—")}
          </dl>
        )}
        {parsed != null
          ? section("Checklist", <SopChecklistBody data={parsed} />)
          : section(
              "Checklist",
              <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
                {dlRow("Items", Number.isFinite(itemCount) ? String(Math.round(itemCount)) : "—")}
                {dlRow("Completed", Number.isFinite(completedCount) ? String(Math.round(completedCount)) : "—")}
              </dl>
            )}
      </>
    );
  }

  if (entry.kind === "shifts") {
    return section(
      "Assignment",
      <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
        {dlRow("Assignee", str(d.staffName) || "—")}
        {dlRow("Role", str(d.role) || "—")}
        {dlRow("Shift type", str(d.shiftType) || "—")}
        {dlRow("Shift date", str(d.shiftDate)?.slice(0, 10) || "—")}
        {dlRow("Start", str(d.startTimeText) || "—")}
        {dlRow("End", str(d.endTimeText) || "—")}
        {dlRow("Status", str(d.status) || "—")}
        {dlRow("Assigned by", str(d.assignedBy) || "—")}
      </dl>
    );
  }

  if (entry.kind === "stock_movements") {
    const qty = parseNum(d.quantityDeltaBaseUnit);
    return section(
      "Ledger row",
      <dl className="rounded-xl border border-teal-100/80 bg-teal-50/30 px-3">
        {dlRow("Ingredient", str(d.ingredientName) || "—")}
        {dlRow("Location", `${str(d.locationCode) || "—"}${str(d.locationName) ? ` · ${str(d.locationName)}` : ""}`)}
        {dlRow("Quantity Δ", `${qty >= 0 ? "+" : ""}${formatQty(qty)} (base unit)`)}
        {dlRow("Movement type", str(d.movementType) || "—")}
        {dlRow("Source type", str(d.sourceType) || "—")}
        {dlRow("Source ID", str(d.sourceId) || "—")}
        {dlRow("Actor (staff id)", str(d.actorStaffId) || "—")}
        {dlRow("Notes", str(d.notes) || "—")}
      </dl>
    );
  }

  if (entry.kind === "violations") {
    return <p className="text-sm text-teal-800/70">Violation sync is not wired yet; no detail available.</p>;
  }

  return (
    <p className="text-sm text-teal-800/70">
      No structured view for <span className="font-medium">{kindLabel(entry.kind)}</span>.
    </p>
  );
}

export function WorkLogEntryDebugJson({ detail }: { detail: Record<string, unknown> }) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <details className="mt-4 rounded-xl border border-dashed border-teal-200/80 bg-teal-50/20 p-2">
      <summary className="cursor-pointer text-xs font-medium text-teal-800/70">Developer: raw JSON</summary>
      <pre className="mt-2 max-h-40 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-teal-900">
        {JSON.stringify(detail, null, 2)}
      </pre>
    </details>
  );
}
