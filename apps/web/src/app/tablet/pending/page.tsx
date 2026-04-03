import OrdersClient from "@/app/pos/orders/orders-client";

export default function TabletPendingPage() {
  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <OrdersClient variant="tabletPending" />
    </div>
  );
}
