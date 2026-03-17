import { extractSizeTemp } from "./lineItemDisplay";

/**
 * Sticker print decision:
 * - When stickerPrintCategoryIds is missing or empty: print no stickers.
 * - When stickerPrintCategoryIds is set: print when line has size/temp OR line's categoryCloudId is in the list.
 * - No longer uses legacy isDrink or serveVessel.
 */
export function shouldPrintSticker(
  line: {
    baseType?: string | null;
    sizeLabel?: string | null;
    optionsJson?: string | null;
    categoryCloudId?: string | null;
  },
  stickerPrintCategoryIds?: string[] | null
): boolean {
  if (!stickerPrintCategoryIds?.length) return false;
  const { temp, size } = extractSizeTemp(line);
  if (temp || size) return true;
  if (line.categoryCloudId && stickerPrintCategoryIds.includes(line.categoryCloudId)) return true;
  return false;
}

/** Parsed option entry from API optionsJson */
type ParsedOpt =
  | { type: "size"; baseType: string; sizeLabel: string }
  | { type: "milk"; choice: string; upchargeCents?: number }
  | { type: "shots"; qty: number; upchargeCents?: number }
  | { type: "surcharge" | "discount"; [k: string]: unknown }
  | { id?: string; name?: string; group?: string; priceDelta?: number; missing?: boolean };

function parseOptionsJson(optionsJson: string | null | undefined): ParsedOpt[] {
  if (!optionsJson) return [];
  try {
    return JSON.parse(optionsJson) as ParsedOpt[];
  } catch {
    return [];
  }
}

/**
 * Drink name for sticker: product name + size/temp when present (café-operational label).
 */
export function getStickerDrinkName(line: { name: string; baseType?: string | null; sizeLabel?: string | null; optionsJson?: string | null }): string {
  const { temp, size } = extractSizeTemp(line);
  const lineStr = [temp, size].filter(Boolean).join(" ");
  if (!lineStr) return line.name;
  return `${line.name} - ${lineStr}`;
}

/**
 * Format line for kitchen sticker. Order: drink name, temp+size, shots, milk, sweetness (once), add-ons, ice, special instructions (quoted).
 * Aligned with API print.service.ts getStickerLineLabel so HTML preview matches TSPL output.
 */
export function getStickerLineLabel(line: { name: string; baseType?: string | null; sizeLabel?: string | null; optionsJson?: string | null; note?: string | null }): string {
  const opts = parseOptionsJson(line.optionsJson);
  const { temp, size } = extractSizeTemp(line);
  const parts: string[] = [line.name];

  const sizeTempLine = [temp, size].filter(Boolean).join(" ");
  if (sizeTempLine) parts.push(sizeTempLine.toUpperCase());

  const shotsOpt = opts.find((o) => o && (o as { type?: string }).type === "shots") as { qty?: number } | undefined;
  if (shotsOpt && (shotsOpt.qty ?? 0) >= 1) {
    const qty = shotsOpt.qty ?? 0;
    parts.push(qty > 1 ? `${qty} SHOTS` : "1 SHOT");
  }

  const milkOpt = opts.find((o) => o && (o as { type?: string }).type === "milk") as { choice?: string } | undefined;
  if (milkOpt?.choice) {
    const choice = milkOpt.choice;
    const label = choice === "OAT" ? "OAT MILK" : choice === "SOY" ? "SOY MILK" : choice === "ALMOND" ? "ALMOND MILK" : choice === "FULL_CREAM" ? "FULL CREAM" : (choice ? choice.toUpperCase() : "");
    if (label) parts.push(label);
  }

  function normalizeModifierLabel(s: string): string {
    return s.trim().toUpperCase().replace(/\s+/g, " ");
  }
  const seenModifierLabels = new Set<string>();

  const sweetnessOpts = opts.filter((o) => {
    if (!o || (o as { type?: string }).type) return false;
    const g = ((o as { group?: string }).group ?? "").toUpperCase();
    return /SUGAR|SWEET/.test(g);
  });
  sweetnessOpts.forEach((o) => {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      parts.push(name);
    }
  });

  const addOnOpts = opts.filter((o) => {
    if (!o || (o as { type?: string }).type) return false;
    const g = ((o as { group?: string }).group ?? "").toUpperCase();
    const n = ((o as { name?: string }).name ?? "").toUpperCase();
    if (/ADD|SYRUP|SAUCE|EXTRA|OPTION|TOPPING|DRIZZLE|CREAM|DESSERT/.test(g)) return true;
    return /SYRUP|SAUCE|ICE CREAM|WHIPPED|CREAM|DRIZZLE/.test(n);
  });
  addOnOpts.forEach((o) => {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      parts.push(name);
    }
  });

  const iceOpts = opts.filter((o) => {
    if (!o || (o as { type?: string }).type) return false;
    const n = ((o as { name?: string }).name ?? "").toUpperCase();
    const g = ((o as { group?: string }).group ?? "").toUpperCase();
    if (/ICE/.test(g)) return true;
    if (/ICE/.test(n) && n !== "ICED") return true;
    if (/LESS|NO ICE|LIGHT ICE|EXTRA ICE|REGULAR ICE/.test(n)) return true;
    return false;
  });
  iceOpts.forEach((o) => {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      parts.push(name);
    }
  });

  if (line.note && line.note.trim()) {
    const specialInstructions = line.note
      .trim()
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `"${s.replace(/"/g, "'")}"`);
    specialInstructions.forEach((quoted) => parts.push(quoted));
  }

  return parts.filter(Boolean).join("\n");
}
