"use client";

import { useEffect, useState } from "react";
import { loadCart } from "@/lib/cart";

export default function CartClient() {
  const [lines, setLines] = useState(loadCart());

  useEffect(() => {
    const onStorage = () => setLines(loadCart());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const total = lines.reduce((sum, l) => {
    const opt = l.options.reduce((s, o) => s + o.priceDelta, 0);
    return sum + l.qty * (l.basePrice + opt);
  }, 0);

  return (
    <main style={{ padding: 24 }}>
      <h1>Cart</h1>

      {lines.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {lines.map((l) => (
              <li key={l.lineId} style={{ marginBottom: 12 }}>
                <b>{l.qty}× {l.name}</b>{" "}
                <span>
                  ₱{((l.basePrice + l.options.reduce((s, o) => s + o.priceDelta, 0)) / 100).toFixed(2)}
                </span>
                {l.options.length > 0 && (
                  <div style={{ opacity: 0.8 }}>
                    {l.options.map((o) => (
                      <div key={o.optionId}>• {o.groupName}: {o.name}</div>
                    ))}
                  </div>
                )}
                {l.note && <div style={{ fontStyle: "italic" }}>Note: {l.note}</div>}
              </li>
            ))}
          </ul>
          <hr />
          <p><b>Total:</b> ₱{(total / 100).toFixed(2)}</p>
          <p><a href="/checkout">Proceed to checkout</a></p>
        </>
      )}
    </main>
  );
}
