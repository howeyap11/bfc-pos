/**
 * Customer display snapshot: written by POS Register (localStorage + POST to local API)
 * and read by /pos/customer-display. localStorage helps same-browser tabs; API syncs
 * separate kiosk Chrome instances on the same machine.
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
  /** Cloud substitute recipe image when customizing / in cart preview */
  milkImageUrl?: string | null;
  shotsQty?: number;
  qty: number;
  note?: string | null;
  transactionTypeLabel?: string | null;
  /** Unit price (one item) in centavos: base + size + options + milk + shots + line surcharge */
  unitPriceCents?: number;
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

const POLL_MS = 800;

function mergeSnapshot(data: unknown): CustomerDisplaySnapshot {
  if (data == null || typeof data !== "object") {
    return DEFAULT_SNAPSHOT;
  }
  return {
    ...DEFAULT_SNAPSHOT,
    ...(data as CustomerDisplaySnapshot),
  };
}

/**
 * Subscribe for customer display updates.
 * 1) Polls GET /api/pos/customer-display/state (works across separate kiosk Chrome processes).
 * 2) Falls back to localStorage when the API is unreachable or returns error.
 * 3) Still listens for storage events (same-browser multi-tab).
 */
export function subscribeCustomerDisplaySnapshot(callback: (snapshot: CustomerDisplaySnapshot) => void): () => void {
  let cancelled = false;

  const applyLocal = () => {
    callback(getCustomerDisplaySnapshot());
  };

  const fetchFromApi = async () => {
    if (cancelled) return;
    try {
      const res = await fetch("/api/pos/customer-display/state", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as unknown;
        callback(mergeSnapshot(data));
        return;
      }
    } catch {
      // network / proxy down
    }
    applyLocal();
  };

  void fetchFromApi();
  const intervalId = window.setInterval(() => {
    void fetchFromApi();
  }, POLL_MS);

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

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
    window.removeEventListener("storage", handler);
  };
}
