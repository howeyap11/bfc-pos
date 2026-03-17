/**
 * Shared display helpers for POS line items.
 * Single source for extracting temp/size from either data shape:
 * - Direct: item.baseType, item.sizeLabel (cart / frontend)
 * - API: item.optionsJson with { type: "size", baseType, sizeLabel }
 */

export type SizeTempItem = {
  baseType?: string | null;
  sizeLabel?: string | null;
  optionsJson?: string | null;
};

export interface SizeTemp {
  temp: string;
  size: string;
}

/**
 * Extract temperature and size from either shape.
 * 1. If item.baseType or item.sizeLabel exist, use them first.
 * 2. Otherwise parse optionsJson for an entry with type === "size".
 * Returns normalized { temp, size } (e.g. "Iced", "16oz"); empty strings when missing.
 */
export function extractSizeTemp(item: SizeTempItem | null | undefined): SizeTemp {
  const empty: SizeTemp = { temp: "", size: "" };
  if (!item) return empty;

  let temp = "";
  let size = "";

  if (item.baseType != null && item.baseType !== "") {
    temp =
      item.baseType === "ICED"
        ? "Iced"
        : item.baseType === "HOT"
          ? "Hot"
          : item.baseType === "CONCENTRATED"
            ? "Concentrated"
            : (item.baseType.charAt(0) + item.baseType.slice(1).toLowerCase());
  }
  if (item.sizeLabel != null && item.sizeLabel !== "") {
    size = item.sizeLabel;
  }

  if (temp || size) {
    return { temp, size };
  }

  if (item.optionsJson) {
    try {
      const opts = JSON.parse(item.optionsJson) as Array<{
        type?: string;
        baseType?: string;
        sizeLabel?: string;
      }>;
      const sizeOpt = opts.find((o) => o && o.type === "size");
      if (sizeOpt) {
        if (sizeOpt.baseType != null && sizeOpt.baseType !== "") {
          temp =
            sizeOpt.baseType === "ICED"
              ? "Iced"
              : sizeOpt.baseType === "HOT"
                ? "Hot"
                : sizeOpt.baseType === "CONCENTRATED"
                  ? "Concentrated"
                  : (sizeOpt.baseType.charAt(0) + sizeOpt.baseType.slice(1).toLowerCase());
        }
        if (sizeOpt.sizeLabel != null && sizeOpt.sizeLabel !== "") {
          size = sizeOpt.sizeLabel;
        }
      }
    } catch {
      // ignore
    }
  }

  return { temp, size };
}

/**
 * Format temp + size as a single display line, e.g. "Iced 16oz" or "Hot 12oz".
 * Only when at least one value exists.
 */
export function formatSizeTempLine(sizeTemp: SizeTemp): string {
  const parts = [sizeTemp.temp, sizeTemp.size].filter(Boolean);
  return parts.join(" ");
}
