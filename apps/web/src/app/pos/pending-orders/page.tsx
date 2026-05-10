import OrdersClient from "@/app/pos/orders/orders-client";

/** Dedicated URL for the pending queue (same UI as Orders → Pending tab). */
export default function PosPendingOrdersPage() {
  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <OrdersClient defaultInnerTab="pending" />
    </div>
  );
}
