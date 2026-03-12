"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import type { CartItem } from "@/lib/buildTransactionPayload";

const CART_STORAGE_KEY = "bfc_pos_cart";
const QR_ORDER_STORAGE_KEY = "bfc_pos_qr_order_id";

type OrderLineItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineNote: string | null;
  item: {
    id: string;
    name: string;
    imageUrl?: string | null;
    category: { name: string; prepArea?: string } | null;
  } | null;
  options: Array<{
    id: string;
    option: { name: string; group: { name: string } | null } | null;
  }>;
};

type PosOrder = {
  id: string;
  orderNo: number;
  status: string;
  source: string;
  paymentMethod: string;
  paymentStatus: string;
  customerNote: string | null;
  createdAt: string;
  table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
  items: OrderLineItem[];
};

const POLL_INTERVAL_MS = 5000;
const CARD_COLLAPSED_WIDTH = 240;
const CARD_COLLAPSED_MIN_WIDTH = 200;
const CARD_EXPANDED_WIDTH = 520;
const CARD_EXPANDED_MIN_WIDTH = 440;
const CARD_MIN_HEIGHT = 320;
/** Match Register's current order panel: flex 0 0 20% */

function getMinutesElapsed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function getTimerColor(minutes: number): string {
  if (minutes >= 30) return "#ef4444";
  if (minutes >= 20) return "#eab308";
  return "#ffffff";
}

function groupItemsByPrepArea(items: OrderLineItem[]): { KITCHEN: OrderLineItem[]; BAR: OrderLineItem[] } {
  const kitchen: OrderLineItem[] = [];
  const bar: OrderLineItem[] = [];
  for (const li of items) {
    const prepArea = li.item?.category?.prepArea;
    if (prepArea === "KITCHEN") kitchen.push(li);
    else bar.push(li);
  }
  return { KITCHEN: kitchen, BAR: bar };
}

function parseStoredCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

function calculateLineTotal(item: CartItem): number {
  const subtotal = (item.basePrice + (item.optionTotalCents ?? 0)) * (item.qty || 1);
  const discount = item.discountAmount ?? 0;
  const surcharge = (item.surchargeCents ?? 0) * (item.qty || 1);
  return Math.max(0, subtotal - discount + surcharge);
}

function formatLineModifiers(item: CartItem): { primaryText: string; secondaryParts: string[]; fulfillmentLabel: string; fulfillmentColor: string } {
  const primaryParts: string[] = [];
  const secondaryParts: string[] = [];
  item.selectedOptions?.forEach((opt) => {
    const optName = (opt.name || "").toUpperCase();
    const groupName = (opt.groupName || "").toUpperCase();
    if (groupName.includes("TEMPERATURE") || optName.includes("ICED") || optName.includes("HOT")) primaryParts.push(opt.name);
    else if (groupName.includes("SIZE") || optName.includes("OZ") || /SMALL|MEDIUM|LARGE/.test(optName)) primaryParts.push(opt.name);
    else secondaryParts.push(opt.name);
  });
  if (item.milkChoice && item.defaultMilk && item.milkChoice !== item.defaultMilk) {
    const milkLabel = item.milkChoice === "FULL_CREAM" ? "full cream" : item.milkChoice === "OAT" ? "oatmilk" : item.milkChoice === "ALMOND" ? "almond" : "soy";
    secondaryParts.push(`sub ${milkLabel}`);
  }
  if (item.shotsQty !== undefined && item.shotsQty >= 0) {
    secondaryParts.push(`${item.shotsQty} shot${item.shotsQty !== 1 ? "s" : ""}`);
  }
  const txCode = item.transactionTypeCode ?? item.fulfillment ?? "TO_GO";
  const label = item.transactionTypeLabel ?? (txCode === "FOR_HERE" ? "For Here" : txCode === "TO_GO" || txCode === "TAKE_OUT" ? "Take Out" : "Foodpanda");
  const color = txCode === "FOR_HERE" ? "#10b981" : txCode === "TO_GO" || txCode === "TAKE_OUT" ? "#f59e0b" : "#ec4899";
  return { primaryText: primaryParts.join(" "), secondaryParts, fulfillmentLabel: label, fulfillmentColor: color };
}

function OrdersCartLineItem({ item }: { item: CartItem }) {
  const { primaryText, secondaryParts, fulfillmentLabel, fulfillmentColor } = formatLineModifiers(item);
  return (
    <div
      style={{
        padding: 10,
        marginBottom: 8,
        background: "#2a2a2a",
        border: "1px solid #3a3a3a",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: "bold", background: COLORS.primary, color: "#fff", padding: "2px 6px", borderRadius: 3, minWidth: 20, textAlign: "center" }}>
              {item.qty}×
            </span>
            <strong style={{ fontSize: 13, color: "#fff", lineHeight: "1.2" }}>{item.itemName}</strong>
            <span style={{ fontSize: 9, fontWeight: "bold", background: fulfillmentColor, color: "#fff", padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {fulfillmentLabel}
            </span>
          </div>
          {(primaryText || secondaryParts.length > 0) && (
            <div style={{ fontSize: 11, lineHeight: "1.4", marginLeft: 26 }}>
              {primaryText && <span style={{ color: "#fff", fontWeight: "600" }}>{primaryText}</span>}
              {primaryText && secondaryParts.length > 0 && <span style={{ color: "#888" }}>, </span>}
              {secondaryParts.length > 0 && (
                <span style={{ color: "#888" }}>{secondaryParts.join(", ")}</span>
              )}
            </div>
          )}
          {item.note && (
            <div style={{ fontSize: 11, color: "#fbbf24", marginLeft: 26, marginTop: 4, fontStyle: "italic" }}>Note: {item.note}</div>
          )}
          {(item.discountAmount ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: "#fb923c", marginLeft: 26, marginTop: 2 }}>
              {item.discountTag && <span style={{ fontWeight: "bold" }}>{item.discountTag} </span>}
              Discount: {(item.discountPct ?? 0).toFixed(0)}% (-{formatPesos(item.discountAmount ?? 0)})
            </div>
          )}
        </div>
        <strong style={{ fontSize: 14, color: "#4ade80", fontWeight: "600", flexShrink: 0 }}>
          {formatPesos(calculateLineTotal(item))}
        </strong>
      </div>
    </div>
  );
}

export default function OrdersClient() {
  const router = useRouter();
  const [activeStaff, setActiveStaff] = useState<{ staffKey: string } | null>(null);
  const [innerTab, setInnerTab] = useState<"qr" | "pending">("qr");
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [newOrderBadge, setNewOrderBadge] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bfc_active_staff");
      if (stored) {
        const staff = JSON.parse(stored);
        if (staff?.staffKey) setActiveStaff(staff);
      }
    } catch (e) {
      console.error("[Orders] Failed to load active staff", e);
    }
  }, []);

  const loadCartFromStorage = useCallback(() => {
    setCart(parseStoredCart());
  }, []);

  useEffect(() => {
    loadCartFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) loadCartFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadCartFromStorage]);

  const loadOrders = useCallback(async () => {
    if (!activeStaff?.staffKey) return;

    try {
      setError(null);
      const res = await fetch(`/api/pos/orders?tab=${innerTab}`, {
        cache: "no-store",
        headers: { "x-staff-key": activeStaff.staffKey },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(JSON.parse(text || "{}").error || text || "Failed to load orders");

      const data = JSON.parse(text) as PosOrder[];
      setOrders((prev) => {
        if (hasLoadedOnce && data.length > prev.length) {
          setNewOrderBadge((b) => b + (data.length - prev.length));
        }
        return data;
      });
      setHasLoadedOnce(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeStaff?.staffKey, innerTab, hasLoadedOnce]);

  useEffect(() => {
    if (!activeStaff?.staffKey) {
      setLoading(false);
      return;
    }
    setNewOrderBadge(0);
    loadOrders();
    const t = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [activeStaff?.staffKey, innerTab, loadOrders]);

  useEffect(() => {
    if (orders.length === 0) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId((prev) => {
      if (!prev || !orders.some((o) => o.id === prev)) return orders[0].id;
      return prev;
    });
  }, [orders]);

  const clearNewOrderBadge = () => setNewOrderBadge(0);

  async function handleAcceptQROrder(o: PosOrder) {
    if (!activeStaff?.staffKey || acceptingId) return;
    setAcceptingId(o.id);
    setError(null);
    try {
      const res = await fetch(`/api/qr/orders/${o.id}/accept`, {
        method: "POST",
        headers: { "x-staff-key": activeStaff.staffKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept order");

      if (data.kind === "PAYMONGO_DONE") {
        router.push(`/pos/transaction-success?transactionId=${data.transactionId}`);
        return;
      }
      if (data.kind === "CASH_PENDING") {
        const cartItems: CartItem[] = (data.cartPayload || []).map((item: Record<string, unknown>) => {
          const opts = (item.selectedOptions || []) as Array<{ id: string; name: string; groupName?: string; priceDelta: number }>;
          const optionTotalCents = opts.reduce((s, x) => s + (x.priceDelta || 0), 0);
          return {
            tempId: `qr-${Date.now()}-${Math.random()}`,
            itemId: item.itemId as string,
            itemName: item.itemName as string,
            basePrice: (item.basePrice as number) ?? 0,
            qty: (item.qty as number) ?? 1,
            selectedOptions: opts.map((opt) => ({
              id: opt.id,
              name: opt.name,
              groupName: opt.groupName ?? "",
              priceDelta: opt.priceDelta ?? 0,
            })),
            optionTotalCents,
            surchargeCents: 0,
            discountPct: 0,
            discountAmount: 0,
            discountTag: null,
            note: (item.note as string) || "",
          };
        });
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        localStorage.setItem(QR_ORDER_STORAGE_KEY, data.orderId || o.id);
        setCart(cartItems);
        await loadOrders();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleDeclineQROrder(o: PosOrder) {
    if (!activeStaff?.staffKey || decliningId) return;
    setDecliningId(o.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${o.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-key": activeStaff.staffKey,
        },
        body: JSON.stringify({ reason: "Declined by staff" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to decline order");
      await loadOrders();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDecliningId(null);
    }
  }

  const renderOrderCard = (
    o: PosOrder,
    opts: {
      isQr: boolean;
      primaryActionLabel: string;
      onPrimary: () => void;
      showSecondary?: boolean;
      onSecondary?: () => void;
      secondaryLabel?: string;
    }
  ) => {
    const minutes = getMinutesElapsed(o.createdAt);
    const timerColor = getTimerColor(minutes);
    const isExpanded = expandedOrderId === o.id;
    const { KITCHEN: kitchenItems, BAR: barItems } = groupItemsByPrepArea(o.items);
    const isLoading = opts.isQr && (acceptingId === o.id || decliningId === o.id);

    const header = (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isExpanded ? 16 : 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: "700", color: timerColor, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🕐</span>
            <span>{Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}</span>
          </span>
          <span style={{ fontSize: isExpanded ? 14 : 16, fontWeight: "600", color: COLORS.textPrimary }}>
            order #{String(o.orderNo).padStart(4, "0")}
          </span>
        </div>
      </div>
    );

    const CardContent = opts.isQr ? (
      <>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {header}
          {o.table && isExpanded && (
            <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>
              {o.table.zone?.code}-{o.table.label}
            </div>
          )}
          {isExpanded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            {kitchenItems.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase" }}>
                  Kitchen
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {kitchenItems.map((li) => (
                    <div
                      key={li.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#2a2a2a",
                        padding: "10px 14px",
                        borderRadius: 10,
                        minWidth: 180,
                      }}
                    >
                      {li.item?.imageUrl && (
                        <img src={li.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                      )}
                      <div>
                        <span style={{ fontWeight: "600", color: COLORS.textPrimary }}>
                          x{li.qty} {li.item?.name ?? "Item"}
                        </span>
                        {li.options.length > 0 && (
                          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            {li.options.map((x) => x.option?.name).filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {barItems.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase" }}>
                  Bar
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {barItems.map((li) => (
                    <div
                      key={li.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#2a2a2a",
                        padding: "10px 14px",
                        borderRadius: 10,
                        minWidth: 180,
                      }}
                    >
                      {li.item?.imageUrl && (
                        <img src={li.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                      )}
                      <div>
                        <span style={{ fontWeight: "600", color: COLORS.textPrimary }}>
                          x{li.qty} {li.item?.name ?? "Item"}
                        </span>
                        {li.options.length > 0 && (
                          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            {li.options.map((x) => x.option?.name).filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kitchenItems.length > 0 && (
              <div style={{ fontSize: 18, color: "#fff", fontWeight: "600", lineHeight: 1.4 }}>
                <span style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" }}>Kitchen </span>
                {kitchenItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}
              </div>
            )}
            {barItems.length > 0 && (
              <div style={{ fontSize: 18, color: "#fff", fontWeight: "600", lineHeight: 1.4 }}>
                <span style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" }}>Bar </span>
                {barItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}
              </div>
            )}
          </div>
        )}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", paddingTop: 16 }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              opts.onPrimary();
            }}
            style={{
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: "600",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {acceptingId === o.id ? "Accepting…" : opts.primaryActionLabel}
          </button>
          {opts.showSecondary && opts.onSecondary && (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                opts.onSecondary?.();
              }}
              style={{
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: "600",
                background: "transparent",
                color: "#ef4444",
                border: "2px solid #ef4444",
                borderRadius: 8,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {decliningId === o.id ? "Declining…" : opts.secondaryLabel ?? "Decline"}
            </button>
          )}
        </div>
      </>
    ) : (
      <>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {header}
          {isExpanded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            {kitchenItems.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase" }}>
                  Kitchen
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {kitchenItems.map((li) => (
                    <div key={li.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#2a2a2a", padding: "10px 14px", borderRadius: 10, minWidth: 180 }}>
                      {li.item?.imageUrl && <img src={li.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
                      <div>
                        <span style={{ fontWeight: "600", color: COLORS.textPrimary }}>x{li.qty} {li.item?.name ?? "Item"}</span>
                        {li.options.length > 0 && <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{li.options.map((x) => x.option?.name).filter(Boolean).join(", ")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {barItems.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase" }}>Bar</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {barItems.map((li) => (
                    <div key={li.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#2a2a2a", padding: "10px 14px", borderRadius: 10, minWidth: 180 }}>
                      {li.item?.imageUrl && <img src={li.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
                      <div>
                        <span style={{ fontWeight: "600", color: COLORS.textPrimary }}>x{li.qty} {li.item?.name ?? "Item"}</span>
                        {li.options.length > 0 && <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{li.options.map((x) => x.option?.name).filter(Boolean).join(", ")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kitchenItems.length > 0 && <div style={{ fontSize: 18, color: "#fff", fontWeight: "600", lineHeight: 1.4 }}><span style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" }}>Kitchen </span>{kitchenItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}</div>}
            {barItems.length > 0 && <div style={{ fontSize: 18, color: "#fff", fontWeight: "600", lineHeight: 1.4 }}><span style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" }}>Bar </span>{barItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}</div>}
          </div>
        )}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/pos/register?qrOrderId=${o.id}`);
            }}
            style={{ padding: "10px 18px", fontSize: 14, fontWeight: "600", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      </>
    );

    return (
      <div
        key={o.id}
        role="button"
        tabIndex={0}
        onClick={() => setExpandedOrderId(o.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpandedOrderId(o.id)}
        style={{
          display: "flex",
          flexDirection: "column",
          background: COLORS.bgPanel,
          borderRadius: 12,
          padding: 16,
          border: `2px solid ${COLORS.borderLight}`,
          overflow: "hidden",
          minWidth: isExpanded ? CARD_EXPANDED_MIN_WIDTH : CARD_COLLAPSED_MIN_WIDTH,
          width: isExpanded ? CARD_EXPANDED_WIDTH : CARD_COLLAPSED_WIDTH,
          minHeight: CARD_MIN_HEIGHT,
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        {CardContent}
      </div>
    );
  };

  if (!activeStaff?.staffKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24, background: COLORS.bgDarkest }}>
        <div style={{ background: COLORS.bgDark, padding: 32, borderRadius: 12, border: `1px solid ${COLORS.borderLight}`, maxWidth: 400, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 20, color: COLORS.textPrimary }}>Staff Login Required</h2>
          <p style={{ margin: "0 0 24px 0", fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.5 }}>
            No active staff session. Please login from the Register page first.
          </p>
          <button
            type="button"
            onClick={() => router.push("/pos/register")}
            style={{ padding: "14px 28px", fontSize: 16, fontWeight: "600", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: COLORS.bgDarkest }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>Orders</h1>
        {newOrderBadge > 0 && (
          <span
            onClick={clearNewOrderBadge}
            style={{ padding: "4px 10px", fontSize: 13, fontWeight: "600", background: COLORS.primary, color: "#fff", borderRadius: 20, cursor: "pointer" }}
          >
            {newOrderBadge} new
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${COLORS.borderLight}`, paddingBottom: 16 }}>
        <button
          type="button"
          onClick={() => setInnerTab("qr")}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            fontWeight: "600",
            background: innerTab === "qr" ? COLORS.primary : COLORS.bgPanel,
            color: innerTab === "qr" ? "#fff" : COLORS.textSecondary,
            border: innerTab === "qr" ? "none" : `1px solid ${COLORS.borderLight}`,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          QR Orders
        </button>
        <button
          type="button"
          onClick={() => setInnerTab("pending")}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            fontWeight: "600",
            background: innerTab === "pending" ? COLORS.primary : COLORS.bgPanel,
            color: innerTab === "pending" ? "#fff" : COLORS.textSecondary,
            border: innerTab === "pending" ? "none" : `1px solid ${COLORS.borderLight}`,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Pending Orders
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#7f1d1d", border: `1px solid ${COLORS.error}`, borderRadius: 6, color: "#fecaca" }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, overflow: "hidden", background: "#1f1f1f" }}>
        <div
          style={{
            flex: "0 0 80%",
            display: "flex",
            flexDirection: "row",
            gap: 16,
            overflowX: "auto",
            overflowY: "hidden",
            alignItems: "stretch",
            paddingBottom: 8,
            minWidth: 0,
            borderRight: "2px solid #2a2a2a",
          }}
        >
          {loading ? (
            <p style={{ color: COLORS.textSecondary }}>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p style={{ color: COLORS.textSecondary }}>No orders.</p>
          ) : innerTab === "qr" ? (
            orders.map((o) =>
              renderOrderCard(o, {
                isQr: true,
                primaryActionLabel: "Accept",
                onPrimary: () => handleAcceptQROrder(o),
                showSecondary: true,
                onSecondary: () => handleDeclineQROrder(o),
                secondaryLabel: "Decline",
              })
            )
          ) : (
            orders.map((o) =>
              renderOrderCard(o, {
                isQr: false,
                primaryActionLabel: "Done",
                onPrimary: () => router.push(`/pos/register?qrOrderId=${o.id}`),
              })
            )
          )}
        </div>

        <div
          style={{
            flex: "0 0 20%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#0a0a0a",
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid #2a2a2a", background: "#1f1f1f" }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Current Order</h2>
          </div>
          {cart.length > 0 ? (
            <div style={{ padding: 12, borderBottom: "2px solid #2a2a2a", background: "#1a1a1a" }}>
              <div style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Accepted QR order</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Go to Register to complete payment</div>
            </div>
          ) : null}
          {cart.length === 0 ? (
            <div style={{ flex: 1, padding: 16 }}>
              <p style={{ color: "#666", fontSize: 13, textAlign: "center", marginTop: 20 }}>Cart is empty</p>
              <p style={{ color: "#888", fontSize: 12, textAlign: "center", marginTop: 8 }}>Accept a QR order to load items here.</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
                {cart.map((item) => (
                  <OrdersCartLineItem key={item.tempId} item={item} />
                ))}
              </div>
              <div style={{ padding: 12, borderTop: "1px solid #2a2a2a", background: "#1f1f1f" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: "#aaa" }}>Subtotal:</span>
                  <strong style={{ color: "#fff" }}>{formatPesos(cart.reduce((s, i) => s + calculateLineTotal(i), 0))}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: "bold", paddingTop: 12, borderTop: "2px solid #3a3a3a", marginBottom: 16, color: "#4ade80" }}>
                  <span>TOTAL:</span>
                  <span>{formatPesos(cart.reduce((s, i) => s + calculateLineTotal(i), 0))}</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/pos/register")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    fontWeight: "600",
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  Go to Register to pay
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
