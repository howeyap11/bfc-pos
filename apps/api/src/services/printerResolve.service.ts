/**
 * Map configured printer names (from printer-config.json) to Windows queue names
 * returned by enumeration. Receipt: exact trim + case-insensitive only.
 * Sticker: same, then optional single unambiguous contains match (excluding receipt queue).
 */

export type ReceiptMatchKind = "exact_trim" | "case_insensitive" | "ambiguous_ci" | "none";
export type StickerMatchKind =
  | ReceiptMatchKind
  | "contains_unique"
  | "ambiguous_contains";

export function trimPrinterName(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  return value.trim();
}

function lowerTrim(value: string): string {
  return trimPrinterName(value).toLowerCase();
}

export type ExactOrCiResult =
  | { queueName: string; kind: "exact_trim" | "case_insensitive" }
  | { queueName: null; kind: "ambiguous_ci"; candidates: string[] }
  | { queueName: null; kind: "none" };

/**
 * Exact trimmed match, then case-insensitive unique match.
 */
export function resolveExactOrCaseInsensitive(
  configured: string,
  available: string[]
): ExactOrCiResult {
  const c = trimPrinterName(configured);
  if (!c) return { queueName: null, kind: "none" };

  for (const a of available) {
    if (trimPrinterName(a) === c) {
      return { queueName: a, kind: "exact_trim" };
    }
  }

  const lc = lowerTrim(c);
  const ciMatches = available.filter((a) => lowerTrim(a) === lc);
  if (ciMatches.length === 1) {
    return { queueName: ciMatches[0], kind: "case_insensitive" };
  }
  if (ciMatches.length > 1) {
    return { queueName: null, kind: "ambiguous_ci", candidates: ciMatches };
  }

  return { queueName: null, kind: "none" };
}

export type StickerResolveResult =
  | { queueName: string; kind: "exact_trim" | "case_insensitive" }
  | { queueName: string; kind: "contains_unique" }
  | { queueName: null; kind: "ambiguous_ci"; candidates: string[] }
  | { queueName: null; kind: "ambiguous_contains"; candidates: string[] }
  | { queueName: null; kind: "none" };

/**
 * Sticker: exact + CI, then at most one contains match (substring either way).
 * Excludes the resolved receipt queue so a vague sticker name cannot bind to the receipt printer.
 */
export function resolveStickerQueueName(
  configured: string,
  available: string[],
  resolvedReceiptQueueName: string | null
): StickerResolveResult {
  const base = resolveExactOrCaseInsensitive(configured, available);
  if (base.kind === "exact_trim" || base.kind === "case_insensitive") {
    return base;
  }
  if (base.kind === "ambiguous_ci") {
    return base;
  }

  const c = trimPrinterName(configured);
  if (!c) {
    return { queueName: null, kind: "none" };
  }

  const lc = lowerTrim(c);
  const receiptLc = resolvedReceiptQueueName ? lowerTrim(resolvedReceiptQueueName) : null;

  const containsCandidates = available.filter((a) => {
    const al = lowerTrim(a);
    if (receiptLc && al === receiptLc) return false;
    return al.includes(lc) || lc.includes(al);
  });

  const unique = [...new Set(containsCandidates)];
  if (unique.length === 1) {
    return { queueName: unique[0], kind: "contains_unique" };
  }
  if (unique.length > 1) {
    return { queueName: null, kind: "ambiguous_contains", candidates: unique };
  }

  return { queueName: null, kind: "none" };
}
