/**
 * Shared POS / tablet line formatting: pending orders, KDS, orders tab.
 * Keeps category off the UI; sub-category + item + size/temp + customization details.
 */

import { lineItemDisplayParts } from "@/lib/printHelpers";
import type {
  OrderLineItem,
  PendingItem,
  PendingTransactionLineItem,
} from "@/app/pos/orders/kitchen-types";

const MS_24H = 24 * 60 * 60 * 1000;

export function isPendingOlderThan24Hours(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > MS_24H;
}

/** Elapsed since createdAt as HH:MM:SS (local clock). */
export function formatElapsedHms(createdAt: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** e.g. 7:38am for print button */
export function formatOrderedTimeAmPm(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Matches cart / register fulfillment badge colors. */
export function transactionTypeUi(serviceType: string | null | undefined): { label: string; bg: string } {
  const s = (serviceType ?? "").toUpperCase();
  if (s === "DINE_IN") return { label: "FOR HERE", bg: "#10b981" };
  if (s === "TO_GO") return { label: "TO GO", bg: "#f59e0b" };
  if (s === "FOODPANDA") return { label: "FOODPANDA", bg: "#ec4899" };
  if (s === "DELIVERY") return { label: "DELIVERY", bg: "#ec4899" };
  return { label: "TO GO", bg: "#f59e0b" };
}

export function formatQrOrderOptions(li: OrderLineItem): { sizeTemp: string; secondary: string[] } {
  const primaryParts: string[] = [];
  const secondary: string[] = [];
  for (const x of li.options) {
    const name = (x.option?.name ?? "").trim();
    if (!name) continue;
    const gn = (x.option?.group?.name ?? "").toUpperCase();
    const un = name.toUpperCase();
    if (gn.includes("TEMPERATURE") || un.includes("ICED") || un.includes("HOT")) primaryParts.push(name);
    else if (gn.includes("SIZE") || /OZ\b/i.test(un) || /SMALL|MEDIUM|LARGE/.test(un)) primaryParts.push(name);
    else secondary.push(name);
  }
  return { sizeTemp: primaryParts.join(" "), secondary };
}

export type TxLineDisplay = {
  qtyLine: string;
  nameWithSizeTemp: string;
  detailLine: string;
};

/** Pending paid transaction line: no category; size/temp once on name line; details = milk/shots/modifiers only. */
export function formatPendingTransactionLine(li: PendingTransactionLineItem): TxLineDisplay {
  const { primary, secondary } = lineItemDisplayParts({ optionsJson: li.optionsJson });
  const sub = (li.subCategoryName ?? "").trim();
  const q = Math.max(1, li.qty ?? 1);
  const qtyLine = sub ? `${q}x ${sub.toUpperCase()}` : `${q}x`;
  const baseName = (li.name ?? "").trim();
  const nameWithSizeTemp = [baseName, primary].filter(Boolean).join(" ").trim();
  const detailLine = secondary.filter(Boolean).join(" · ");
  return { qtyLine, nameWithSizeTemp, detailLine };
}

export type QrLineDisplay = {
  qtyLine: string;
  nameWithSizeTemp: string;
  detailLine: string;
};

export function formatQrOrderLine(li: OrderLineItem): QrLineDisplay {
  const { sizeTemp, secondary } = formatQrOrderOptions(li);
  const q = Math.max(1, li.qty ?? 1);
  const qtyLine = `${q}x`;
  const baseName = (li.item?.name ?? "Item").trim();
  const nameWithSizeTemp = [baseName, sizeTemp].filter(Boolean).join(" ").trim();
  const detailLine = secondary.join(" · ");
  return { qtyLine, nameWithSizeTemp, detailLine };
}

export function lineLabelForPrintModal(li: PendingTransactionLineItem): string {
  const { nameWithSizeTemp } = formatPendingTransactionLine(li);
  return nameWithSizeTemp;
}

/** Prefer synced cloud category id (kitchen settings); fall back to local Category id. */
function kitchenFilterCategoryId(li: {
  item?: { category?: { id?: string; cloudCategoryId?: string | null } | null } | null;
}): string | null {
  const c = li.item?.category;
  if (!c) return null;
  const id = c.cloudCategoryId ?? c.id;
  return id != null && id !== "" ? id : null;
}

export function orderQualifiesForKitchen(item: PendingItem, kitchenCategoryIds: string[]): boolean {
  if (kitchenCategoryIds.length === 0) return true;
  const set = new Set(kitchenCategoryIds);
  if (item.kind === "order") {
    return item.order.items.some((li) => {
      const id = kitchenFilterCategoryId(li);
      return id != null && set.has(id);
    });
  }
  return item.transaction.lineItems.some((li) => {
    const id = kitchenFilterCategoryId(li);
    return id != null && set.has(id);
  });
}

export function filterPendingForKitchen(items: PendingItem[], kitchenCategoryIds: string[]): PendingItem[] {
  if (kitchenCategoryIds.length === 0) return items;
  return items.filter((p) => orderQualifiesForKitchen(p, kitchenCategoryIds));
}
