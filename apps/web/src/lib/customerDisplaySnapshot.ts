/**
 * Customer display snapshot: read-only state written by POS Register
 * and read by /pos/customer-display. Stored in localStorage for cross-window sync.
 */

export const CUSTOMER_DISPLAY_STORAGE_KEY = "bfc_customer_display_snapshot";

export type CustomerDisplayMode = "idle" | "active-item" | "cart-review" | "preparing";

export type ItemPreview = {
  itemName: string;
  imageUrl?: string | null;
  baseType?: "HOT" | "ICED" | "CONCENTRATED" | null;
  sizeLabel?: string | null;
  optionNames: string[];
  milkLabel?: string | null;
  shotsQty?: number;
  qty: number;
  note?: string | null;
  transactionTypeLabel?: string | null;
};

export type CartSnapshotItem = {
  itemName: string;
  qty: number;
  lineTotalCents: number;
};

export type CustomerDisplaySnapshot = {
  mode: CustomerDisplayMode;
  activeItemPreview: ItemPreview | null;
  latestAddedItemPreview: ItemPreview | null;
  cartItems: CartSnapshotItem[];
  totalCents: number;
  lastAddedAt: number | null;
  ts: number;
};

export const DEFAULT_SNAPSHOT: CustomerDisplaySnapshot = {
  mode: "idle",
  activeItemPreview: null,
  latestAddedItemPreview: null,
  cartItems: [],
  totalCents: 0,
  lastAddedAt: null,
  ts: 0,
};

export function getCustomerDisplaySnapshot(): CustomerDisplaySnapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;
  try {
    const raw = localStorage.getItem(CUSTOMER_DISPLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw) as CustomerDisplaySnapshot;
    return {
      ...DEFAULT_SNAPSHOT,
      ...parsed,
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

export function subscribeCustomerDisplaySnapshot(callback: (snapshot: CustomerDisplaySnapshot) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === CUSTOMER_DISPLAY_STORAGE_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue) as CustomerDisplaySnapshot);
      } catch {
        callback(DEFAULT_SNAPSHOT);
      }
    }
  };
  window.addEventListener("storage", handler);
  callback(getCustomerDisplaySnapshot());
  return () => window.removeEventListener("storage", handler);
}
