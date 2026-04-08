/**
 * POS item open: initial temperature + size from backend default when valid.
 *
 * `defaultSizeOptionId` can be:
 * - A plain size option id (e.g. 16oz) shared across HOT/ICED — use drinkModeDefaults to get mode.
 * - A combined option id (e.g. "16oz Iced" as one option) — id won't appear in sizesByMode; resolve by parsing defaultSizeOptionName.
 */

const MODES = ["HOT", "ICED", "CONCENTRATED"] as const;
export type DrinkModeKey = (typeof MODES)[number];

/** When the same size id exists under multiple modes, prefer HOT so disabled ICED is not chosen by tie-break. */
const AMBIGUOUS_MODE_ORDER: DrinkModeKey[] = ["HOT", "ICED", "CONCENTRATED"];

function pickAmbiguous(modes: DrinkModeKey[]): DrinkModeKey | null {
  for (const m of AMBIGUOUS_MODE_ORDER) {
    if (modes.includes(m)) return m;
  }
  return modes[0] ?? null;
}

/** Normalize for matching: lowercase, collapse spaces. */
function norm(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Parse "16oz Iced" / "Iced 16oz" / "12oz Hot" etc. into mode hint and size label. */
function parseCombinedDefaultName(name: string): { mode: DrinkModeKey; sizeLabel: string } | null {
  const n = norm(name);
  if (!n) return null;
  let mode: DrinkModeKey | null = null;
  if (n.includes("iced")) mode = "ICED";
  else if (n.includes("hot")) mode = "HOT";
  else if (n.includes("concentrated")) mode = "CONCENTRATED";
  if (!mode) return null;
  const ozMatch = n.match(/\d+\s*oz?/i) || n.match(/\d+/);
  const sizeLabel = ozMatch ? ozMatch[0].replace(/\s+/g, "") : "";
  if (!sizeLabel) return null;
  return { mode, sizeLabel };
}

/** True if this size entry's name matches the label (e.g. "16oz" matches "16oz" or "16"). */
function sizeNameMatches(label: string, sizeName: string): boolean {
  const a = norm(sizeName).replace(/\s/g, "");
  const b = norm(label).replace(/\s/g, "");
  return a === b || a.includes(b) || b.includes(a);
}

export function resolveInitialHasSizesModeAndSize(args: {
  defaultSizeOptionId?: string | null;
  defaultSizeOptionName?: string | null;
  sizesByMode?: Record<string, Array<{ id: string; name: string }>> | undefined;
  drinkModeDefaults?: Array<{ mode: string; defaultOptionId: string }> | undefined;
}): {
  mode: DrinkModeKey | null;
  size: { id: string; name: string } | null;
} {
  const sm = args.sizesByMode;
  if (!sm) return { mode: null, size: null };

  const defId = args.defaultSizeOptionId?.trim() || null;
  const byMode = new Map<string, string>();
  for (const row of args.drinkModeDefaults ?? []) {
    const m = (row.mode || "").toUpperCase();
    if (MODES.includes(m as DrinkModeKey)) byMode.set(m, row.defaultOptionId);
  }

  const defIdInSizes =
    defId && MODES.some((m) => (sm[m] ?? []).some((s) => s.id === defId));

  // 0) Combined default (e.g. "16oz Iced"): resolve by option name when id is not in sizesByMode, or when we only have the name (e.g. from group default)
  if (args.defaultSizeOptionName) {
    const parsed = parseCombinedDefaultName(args.defaultSizeOptionName);
    const list = parsed ? (sm[parsed.mode] ?? []) : [];
    const found = parsed ? list.find((s) => sizeNameMatches(parsed!.sizeLabel, s.name)) : null;
    const useNameOnly = found && (!defId || !defIdInSizes);
    if (found && useNameOnly) return { mode: parsed!.mode, size: { id: found.id, name: found.name } };
  }

  // 1) Item default size matches that mode's configured default (e.g. ICED default 16oz + item.defaultSizeOptionId 16oz)
  if (defId && byMode.size > 0) {
    const matching: DrinkModeKey[] = [];
    for (const m of MODES) {
      if (byMode.get(m) !== defId) continue;
      const found = (sm[m] ?? []).find((s) => s.id === defId);
      if (found) matching.push(m);
    }
    if (matching.length >= 1) {
      const m = (matching.length === 1 ? matching[0] : pickAmbiguous(matching))!;
      const found = (sm[m] ?? []).find((s) => s.id === defId)!;
      return { mode: m, size: { id: found.id, name: found.name } };
    }
  }

  // 2) Default size id appears under mode(s); no per-mode default row — ICED-first tie-break
  if (defId) {
    const withSize: DrinkModeKey[] = [];
    for (const m of MODES) {
      if ((sm[m] ?? []).some((s) => s.id === defId)) withSize.push(m);
    }
    if (withSize.length >= 1) {
      const m = (withSize.length === 1 ? withSize[0] : pickAmbiguous(withSize))!;
      const found = (sm[m] ?? []).find((s) => s.id === defId)!;
      return { mode: m, size: { id: found.id, name: found.name } };
    }
  }

  // 3) No global default id: first mode in ICED→HOT→CONCENTRATED with a per-mode default that exists in sizes
  if (byMode.size > 0) {
    for (const m of AMBIGUOUS_MODE_ORDER) {
      const optId = byMode.get(m);
      if (!optId) continue;
      const found = (sm[m] ?? []).find((s) => s.id === optId);
      if (found) return { mode: m, size: { id: found.id, name: found.name } };
    }
  }

  // No default from backend: prefer HOT then ICED then CONCENTRATED; prefer 16oz over 12oz when both exist (common default)
  const mode =
    AMBIGUOUS_MODE_ORDER.find((m) => (sm[m]?.length ?? 0) > 0) ?? null;
  const list = mode ? (sm[mode] ?? []) : [];
  const s0 =
    list.length === 0 ? null : list.find((s) => /16/.test(s.name)) ?? list[0];
  return { mode, size: s0 ? { id: s0.id, name: s0.name } : null };
}
