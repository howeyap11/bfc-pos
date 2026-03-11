"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";

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

function getMinutesElapsed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function getTimerColor(minutes: number): string {
  if (minutes >= 30) return "#ef4444"; // Red
  if (minutes >= 20) return "#eab308"; // Yellow
  return "#ffffff"; // White (< 20 min)
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

  async function loadOrders() {
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
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeStaff?.staffKey) {
      setLoading(false);
      return;
    }
    setNewOrderBadge(0);
    loadOrders();
    const t = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [activeStaff?.staffKey, innerTab]);

  function clearNewOrderBadge() {
    setNewOrderBadge(0);
  }

  if (!activeStaff?.staffKey) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          background: COLORS.bgDarkest,
        }}
      >
        <div
          style={{
            background: COLORS.bgDark,
            padding: 32,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 20, color: COLORS.textPrimary }}>
            Staff Login Required
          </h2>
          <p style={{ margin: "0 0 24px 0", fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.5 }}>
            No active staff session. Please login from the Register page first.
          </p>
          <button
            type="button"
            onClick={() => router.push("/pos/register")}
            style={{
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: "600",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
        background: COLORS.bgDarkest,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          background: COLORS.bgDark,
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>
            Orders
          </h1>
          {newOrderBadge > 0 && (
            <span
              onClick={clearNewOrderBadge}
              style={{
                padding: "4px 10px",
                fontSize: 13,
                fontWeight: "600",
                background: COLORS.primary,
                color: "#fff",
                borderRadius: 20,
                cursor: "pointer",
              }}
            >
              {newOrderBadge} new
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            borderBottom: `1px solid ${COLORS.borderLight}`,
            paddingBottom: 16,
          }}
        >
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
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "#7f1d1d",
              border: `1px solid ${COLORS.error}`,
              borderRadius: 6,
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: COLORS.textSecondary }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: COLORS.textSecondary }}>No orders.</p>
        ) : innerTab === "pending" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((o) => {
              const minutes = getMinutesElapsed(o.createdAt);
              const timerColor = getTimerColor(minutes);
              const isExpanded = expandedOrderId === o.id;
              const { KITCHEN: kitchenItems, BAR: barItems } = groupItemsByPrepArea(o.items);
              return (
                <div
                  key={o.id}
                  style={{
                    background: COLORS.bgPanel,
                    borderRadius: 12,
                    padding: 16,
                    border: `2px solid ${COLORS.borderLight}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      marginBottom: isExpanded ? 16 : 0,
                    }}
                    onClick={() => setExpandedOrderId((id) => (id === o.id ? null : o.id))}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: "700", color: timerColor, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🕐</span>
                        <span>{Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}</span>
                      </span>
                      {isExpanded && (
                        <span style={{ fontSize: 16, fontWeight: "600", color: COLORS.textPrimary }}>
                          order #{String(o.orderNo).padStart(4, "0")}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: timerColor, fontWeight: "600" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </div>
                  {isExpanded ? (
                    <>
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
                                    <img
                                      src={li.item.imageUrl}
                                      alt=""
                                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                                    />
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
                                    <img
                                      src={li.item.imageUrl}
                                      alt=""
                                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                                    />
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
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {kitchenItems.length > 0 && (
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          <strong style={{ color: COLORS.textPrimary }}>Kitchen:</strong>{" "}
                          {kitchenItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}
                        </div>
                      )}
                      {barItems.length > 0 && (
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          <strong style={{ color: COLORS.textPrimary }}>Bar:</strong>{" "}
                          {barItems.map((li) => `x${li.qty} ${li.item?.name ?? "Item"}`).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/pos/register?qrOrderId=${o.id}`);
                    }}
                    style={{
                      marginTop: 16,
                      padding: "10px 18px",
                      fontSize: 14,
                      fontWeight: "600",
                      background: COLORS.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Accept / Process
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  background: COLORS.bgPanel,
                  borderRadius: 8,
                  padding: 16,
                  border: `1px solid ${COLORS.borderLight}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: "600", color: COLORS.textPrimary }}>
                    #{o.orderNo}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: "600",
                        background: COLORS.primaryLight,
                        color: COLORS.primary,
                        borderRadius: 4,
                      }}
                    >
                      {o.status}
                    </span>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{o.source}</span>
                  </div>
                </div>
                {o.table && (
                  <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>
                    {o.table.zone?.code}-{o.table.label}
                  </div>
                )}
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {o.items.map((li) => (
                    <li key={li.id} style={{ marginBottom: 6, color: COLORS.textPrimary }}>
                      <strong>{li.qty}× {li.item?.name ?? "Item"}</strong>
                      {li.options.length > 0 && (
                        <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                          {li.options
                            .map((x) => x.option?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      {li.lineNote && (
                        <div style={{ fontSize: 12, fontStyle: "italic", color: COLORS.textMuted }}>
                          Note: {li.lineNote}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
                  {new Date(o.createdAt).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/pos/register?qrOrderId=${o.id}`)}
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: "600",
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Accept / Process
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
