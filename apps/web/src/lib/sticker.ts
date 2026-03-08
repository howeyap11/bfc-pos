/**
 * Sticker print decision:
 * - Print when line has size selection (baseType + size from optionsJson).
 * - Legacy: also print when isDrink === true && serveVessel === "PLASTIC_CUP".
 */
export function shouldPrintSticker(line: {
  isDrink?: boolean | null;
  serveVessel?: string | null;
  optionsJson?: string | null;
}): boolean {
  if (line.optionsJson) {
    try {
      const opts = JSON.parse(line.optionsJson) as Array<{ type?: string; baseType?: string; sizeLabel?: string }>;
      const hasSize = opts.some((o) => o.type === "size" && o.baseType && o.sizeLabel);
      if (hasSize) return true;
    } catch {
      // ignore
    }
  }
  return line.isDrink === true && line.serveVessel === "PLASTIC_CUP";
}

/**
 * Format line for kitchen sticker: "Item Name" + base type + size when present.
 */
export function getStickerLineLabel(line: { name: string; optionsJson?: string | null }): string {
  if (!line.optionsJson) return line.name;
  try {
    const opts = JSON.parse(line.optionsJson) as Array<{ type?: string; baseType?: string; sizeLabel?: string }>;
    const sizeOpt = opts.find((o) => o.type === "size" && o.baseType && o.sizeLabel);
    if (sizeOpt) {
      const base = (sizeOpt.baseType ?? "").charAt(0) + (sizeOpt.baseType ?? "").slice(1).toLowerCase();
      return `${line.name}\n${base} ${sizeOpt.sizeLabel}`;
    }
  } catch {
    // ignore
  }
  return line.name;
}
