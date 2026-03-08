"use client";

import { useEffect, useState } from "react";
import { loadCart, saveCart } from "@/lib/cart";

/**
 * QR Menu Checkout Component
 * 
 * QR orders support only 2 payment methods:
 * 1. CASH - Customer pays at counter when order is ready
 * 2. PAYMONGO - Customer pays online via PayMongo gateway
 * 
 * Note: QR orders do NOT use POS payment methods (CARD/GCASH/FOODPANDA/etc).
 * Those are only for direct register sales.
 * 
 * Transaction creation happens later when cashier processes the order:
 * - CASH orders: Cashier clicks "MARK PAID" → creates Sale with method=CASH
 * - PAYMONGO orders: Cashier clicks "ACCEPT" → creates Sale with method=PAYMONGO
 */
export default function CheckoutClient() {
  const [tableId, setTableId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "PAYMONGO">("CASH");

  useEffect(() => {
    try {
      setTableId(localStorage.getItem("bfc_table_id"));
    } catch { }
  }, []);

  async function placeOrder() {
    const cart = loadCart();
    if (!tableId) return alert("Missing table. Please rescan your table QR.");
    if (cart.length === 0) return alert("Cart is empty.");

    setBusy(true);
    try {
      const payload = {
        tablePublicKey: tableId,
        paymentMethod,
        items: cart.map((l) => ({
          itemId: l.itemId,
          qty: l.qty,
          note: l.note,
          optionIds: l.options.map((o) => o.optionId),
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      // clear cart
      saveCart([]);
      alert("Order placed!");
      window.location.href = `/t/${tableId}`;
    } catch (e: any) {
      alert(`Failed to place order: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Checkout</h1>

      <p>Table: <b>{tableId ?? "(unknown)"}</b></p>

      <h3>Payment</h3>
      <label>
        <input
          type="radio"
          checked={paymentMethod === "CASH"}
          onChange={() => setPaymentMethod("CASH")}
        />{" "}
        Cash
      </label>
      <br />
      <label>
        <input
          type="radio"
          checked={paymentMethod === "PAYMONGO"}
          onChange={() => setPaymentMethod("PAYMONGO")}
        />{" "}
        PayMongo (Online Payment)
      </label>

      <br /><br />
      <button disabled={busy} onClick={placeOrder} style={{ padding: "10px 14px" }}>
        {busy ? "Placing..." : "Place order"}
      </button>
    </main>
  );
}
