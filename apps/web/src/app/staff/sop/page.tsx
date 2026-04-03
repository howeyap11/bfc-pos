"use client";

import { useEffect, useState } from "react";
import { withStaffAuthHeaders } from "@/lib/staffAuth";

type Template = {
  id: string;
  cloudId?: string | null;
  name: string;
  shiftType: string;
  version: number;
  checklistJson: string;
};

function checklistItemsFromJson(json: string): { id: string; label: string }[] {
  try {
    const v = JSON.parse(json) as unknown;
    if (Array.isArray(v)) {
      return v.map((x, i) => {
        if (typeof x === "string") return { id: `i${i}`, label: x };
        const o = x as Record<string, unknown>;
        return {
          id: String(o.id ?? `i${i}`),
          label: String(o.label ?? o.text ?? o.name ?? `Item ${i + 1}`),
        };
      });
    }
    if (v && typeof v === "object" && Array.isArray((v as { items?: unknown }).items)) {
      const items = (v as { items: unknown[] }).items;
      return items.map((x, i) => {
        const o = x as Record<string, unknown>;
        return {
          id: String(o.id ?? `i${i}`),
          label: String(o.label ?? o.text ?? `Item ${i + 1}`),
        };
      });
    }
  } catch {
    /* ignore */
  }
  return [];
}

export default function StaffSopPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = templates.find((t) => t.id === selId);

  useEffect(() => {
    fetch("/api/staff/sop/templates/active", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTemplates(list);
        if (list[0]?.id) setSelId(list[0].id);
      })
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    setChecked({});
  }, [selId]);

  const items = selected ? checklistItemsFromJson(selected.checklistJson) : [];

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setMsg("");
    try {
      const result = items.map((it) => ({ id: it.id, label: it.label, checked: !!checked[it.id] }));
      const res = await fetch("/api/staff/sop/submissions", {
        method: "POST",
        headers: withStaffAuthHeaders(),
        body: JSON.stringify({
          templateCloudId: selected.cloudId ?? undefined,
          templateName: selected.name,
          templateVersion: selected.version,
          shiftType: selected.shiftType,
          checklistResultJson: JSON.stringify(result),
          notes: notes || undefined,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      setMsg("Checklist saved locally.");
      setNotes("");
      setChecked({});
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4 text-white sm:px-5 sm:pt-5">
      {templates.length === 0 ? (
        <p className="text-base text-white/50">No active templates synced yet.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-white/50">
              Template
            </label>
            <select
              className="w-full rounded-2xl border border-white/15 bg-zinc-900/80 px-4 py-4 text-lg text-white"
              value={selId}
              onChange={(e) => setSelId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-zinc-900">
                  {t.name} — {t.shiftType}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4"
              >
                <input
                  type="checkbox"
                  className="mt-1.5 h-6 w-6 shrink-0 rounded-md border-white/30 bg-zinc-900 text-emerald-500"
                  checked={!!checked[it.id]}
                  onChange={(e) => setChecked((p) => ({ ...p, [it.id]: e.target.checked }))}
                />
                <span className="min-w-0 flex-1 text-lg leading-snug text-white/95">{it.label}</span>
              </li>
            ))}
          </ul>
          {items.length === 0 && (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-base text-amber-200/90">
              Template has no checklist items in JSON.
            </p>
          )}
          <textarea
            placeholder="Notes (optional)"
            className="w-full rounded-2xl border border-white/15 bg-zinc-900/80 px-4 py-3 text-base text-white placeholder:text-white/35"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            disabled={busy || items.length === 0}
            onClick={submit}
            className="w-full rounded-2xl bg-emerald-600 py-5 text-lg font-semibold text-white shadow-lg disabled:opacity-45"
          >
            {busy ? "Saving…" : "Submit checklist"}
          </button>
          {msg && <p className="text-center text-base text-emerald-400">{msg}</p>}
        </div>
      )}
    </main>
  );
}
