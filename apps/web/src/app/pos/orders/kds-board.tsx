"use client";

import { useMemo } from "react";
import { COLORS } from "@/lib/theme";
import {
  formatPendingTransactionLine,
  formatQrOrderLine,
  transactionTypeUi,
} from "@/lib/orderLineDisplay";
import type { PendingItem, PendingTransactionLineItem, PosOrder } from "./kitchen-types";

const COL_NEW = "#1e3a5f";
const COL_PREP = "#713f12";
const COL_READY = "#14532d";

function getMinutesElapsed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function getTimerColor(minutes: number): string {
  if (minutes >= 30) return "#f87171";
  if (minutes >= 20) return "#facc15";
  return "#e5e7eb";
}

function formatElapsed(createdAt: string): string {
  const m = getMinutesElapsed(createdAt);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  return `${h}h ${mm}m`;
}

function orderKitchenColumn(order: PosOrder): 0 | 1 | 2 {
  if (order.status === "IN_PREP") return 1;
  if (order.status === "READY") return 2;
  return 0;
}

function nextOrderKitchenStatus(order: PosOrder): string | null {
  const s = order.status;
  if (s === "PLACED" || s === "ACCEPTED") return "IN_PREP";
  if (s === "IN_PREP") return "READY";
  if (s === "READY") return "COMPLETED";
  return null;
}

function txKitchenColumn(tx: { prepReadyAt?: string | null; prepStartedAt?: string | null }): 0 | 1 | 2 {
  if (tx.prepReadyAt) return 2;
  if (tx.prepStartedAt) return 1;
  return 0;
}

function stableId(item: PendingItem): string {
  return item.kind === "order" ? `o:${item.order.id}` : `t:${item.transaction.id}`;
}

/** Match pending-orders horizontal strip density (narrow cards = more visible tickets). */
const KITCHEN_CARD_WIDTH = "clamp(220px, min(26vw, 320px), 380px)";

type KdsBoardProps = {
  pendingItems: PendingItem[];
  bumpingOrderId: string | null;
  bumpingTxId: string | null;
  onBumpOrder: (order: PosOrder, nextStatus: string) => void;
  onBumpTransaction: (transactionId: string) => void;
};

export default function KdsBoard({
  pendingItems,
  bumpingOrderId,
  bumpingTxId,
  onBumpOrder,
  onBumpTransaction,
}: KdsBoardProps) {
  /** Same chronological flow as standard pending queue (oldest first). */
  const sortedItems = useMemo(() => {
    return [...pendingItems].sort((a, b) => {
      const tA = a.kind === "order" ? a.order.createdAt : a.transaction.createdAt;
      const tB = b.kind === "order" ? b.order.createdAt : b.transaction.createdAt;
      const xa = new Date(tA).getTime();
      const xb = new Date(tB).getTime();
      return (Number.isFinite(xa) ? xa : 0) - (Number.isFinite(xb) ? xb : 0);
    });
  }, [pendingItems]);

  function renderOrderLines(order: PosOrder) {
    const lines = Array.isArray(order.items) ? order.items : [];
    return lines.map((li) => {
      const { qtyLine, nameWithSizeTemp, detailLine } = formatQrOrderLine(li);
      return (
        <div
          key={li.id}
          style={{
            padding: "12px 14px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.35)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>
            <span style={{ color: COLORS.primary, marginRight: 8 }}>{qtyLine}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginTop: 4 }}>{nameWithSizeTemp}</div>
          {detailLine ? (
            <div style={{ fontSize: 17, color: "#cbd5e1", marginTop: 6, lineHeight: 1.35 }}>{detailLine}</div>
          ) : null}
          {li.lineNote && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#fcd34d",
                marginTop: 8,
                padding: 10,
                background: "rgba(251,191,36,0.12)",
                borderRadius: 8,
              }}
            >
              Note: {li.lineNote}
            </div>
          )}
        </div>
      );
    });
  }

  function renderTxLines(lines: PendingTransactionLineItem[], serviceType?: string | null) {
    const tt = serviceType ? transactionTypeUi(serviceType) : null;
    return lines.map((li) => {
      const { qtyLine, nameWithSizeTemp, detailLine } = formatPendingTransactionLine(li);
      const showMeta = Boolean(detailLine || tt);
      return (
        <div
          key={li.id}
          style={{
            padding: "12px 14px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.35)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>
            <span style={{ color: COLORS.primary, marginRight: 8 }}>{qtyLine}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginTop: 4 }}>{nameWithSizeTemp}</div>
          {li.customerName && (
            <div style={{ fontSize: 20, fontWeight: 600, color: "#93c5fd", marginTop: 4 }}>{li.customerName}</div>
          )}
          {showMeta && (
            <div style={{ fontSize: 17, color: "#cbd5e1", marginTop: 6, lineHeight: 1.35 }}>
              {detailLine}
              {detailLine && tt ? <span> · </span> : null}
              {tt ? (
                <span style={{ color: "#fff", fontWeight: 800 }}>{tt.label}</span>
              ) : null}
            </div>
          )}
          {(li.lineNote || li.specialInstructions) && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#fcd34d",
                marginTop: 8,
                padding: 10,
                background: "rgba(251,191,36,0.12)",
                borderRadius: 8,
              }}
            >
              {li.lineNote && <span>Note: {li.lineNote}</span>}
              {li.lineNote && li.specialInstructions && " · "}
              {li.specialInstructions && <span>Prep: {li.specialInstructions}</span>}
            </div>
          )}
        </div>
      );
    });
  }

  function bumpLabel(col: 0 | 1 | 2): string {
    if (col === 0) return "Start prep";
    if (col === 1) return "Mark ready";
    return "Bump off";
  }

  function renderCard(item: PendingItem, col: 0 | 1 | 2) {
    const borderColor = col === 0 ? COL_NEW : col === 1 ? COL_PREP : COL_READY;
    const headerAccent = col === 0 ? "#60a5fa" : col === 1 ? "#fbbf24" : "#4ade80";

    if (item.kind === "order") {
      const o = item.order;
      const next = nextOrderKitchenStatus(o);
      const busy = bumpingOrderId === o.id;
      const tableLabel = o.table ? `${o.table.zone?.code ?? ""}-${o.table.label}`.replace(/^-/, "") : null;

      return (
        <div
          key={stableId(item)}
          style={{
            background: COLORS.bgPanel,
            borderRadius: 16,
            padding: 20,
            border: `4px solid ${borderColor}`,
            boxShadow: `0 0 0 2px ${headerAccent}33`,
            minHeight: 0,
            flexShrink: 0,
            width: KITCHEN_CARD_WIDTH,
            maxHeight: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: headerAccent, letterSpacing: -1 }}>#{String(o.orderNo).padStart(4, "0")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: getTimerColor(getMinutesElapsed(o.createdAt)) }}>{formatElapsed(o.createdAt)}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSecondary }}>Order · {o.source}</div>
          {tableLabel && <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Table {tableLabel}</div>}
          {o.customerNote && (
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fcd34d", padding: 12, background: "rgba(251,191,36,0.15)", borderRadius: 10 }}>{o.customerNote}</div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{renderOrderLines(o)}</div>
          {next ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onBumpOrder(o, next)}
              style={{
                minHeight: 64,
                fontSize: 22,
                fontWeight: 800,
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.75 : 1,
                marginTop: 8,
              }}
            >
              {busy ? "…" : bumpLabel(col)}
            </button>
          ) : (
            <div style={{ fontSize: 16, color: COLORS.textSecondary, textAlign: "center", padding: 16 }}>No kitchen action</div>
          )}
        </div>
      );
    }

    const tx = item.transaction;
    const busy = bumpingTxId === tx.id;
    const tableLabel = tx.table ? `${tx.table.zone?.code ?? ""}-${tx.table.label}`.replace(/^-/, "") : null;

    return (
      <div
        key={stableId(item)}
        style={{
          background: COLORS.bgPanel,
          borderRadius: 16,
          padding: 20,
          border: `4px solid ${borderColor}`,
          boxShadow: `0 0 0 2px ${headerAccent}33`,
          minHeight: 0,
          flexShrink: 0,
          width: KITCHEN_CARD_WIDTH,
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: headerAccent, letterSpacing: -1 }}>#{String(tx.transactionNo).padStart(4, "0")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: getTimerColor(getMinutesElapsed(tx.createdAt)) }}>{formatElapsed(tx.createdAt)}</div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSecondary }}>Receipt · {tx.source}</div>
        {tx.createdBy && <div style={{ fontSize: 20, fontWeight: 600, color: "#a5b4fc" }}>{tx.createdBy}</div>}
        {tableLabel && <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Table {tableLabel}</div>}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {renderTxLines(Array.isArray(tx.lineItems) ? tx.lineItems : [], tx.serviceType ?? null)}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onBumpTransaction(tx.id)}
          style={{
            minHeight: 64,
            fontSize: 22,
            fontWeight: 800,
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.75 : 1,
            marginTop: 8,
          }}
        >
          {busy ? "…" : bumpLabel(col)}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "row",
          gap: 16,
          overflowX: "auto",
          overflowY: "hidden",
          alignItems: "stretch",
          paddingBottom: 8,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {sortedItems.length === 0 ? (
          <div style={{ padding: 16, color: COLORS.textSecondary, fontSize: 17 }}>No kitchen tickets.</div>
        ) : (
          sortedItems.map((item) =>
            renderCard(
              item,
              item.kind === "order" ? orderKitchenColumn(item.order) : txKitchenColumn(item.transaction)
            )
          )
        )}
      </div>
    </div>
  );
}
