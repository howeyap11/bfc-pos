import OrdersClient from "@/app/pos/orders/orders-client";

/** Canonical tablet URL for pending queue (aliases same UI as `/tablet/pending`). */
export default function TabletPendingOrdersPage() {
  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <OrdersClient variant="tabletPending" />
    </div>
  );
}
