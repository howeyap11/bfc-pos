"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCart, saveCart, type CartLine, type CartOption } from "@/lib/cart";

type Option = {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
};

type Group = {
  id: string;
  name: string;
  type: "SINGLE" | "MULTI";
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: Option[];
};

type ApiItem = {
  id: string;
  name: string;
  basePrice: number;
  itemOptionGroups: { group: Group }[];
};

type ApiError = { error: string; message?: string };

export default function ItemClient({
  tableId,
  itemId,
}: {
  tableId: string;
  itemId: string;
}) {
  // ✅ explicit states
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState<ApiItem | null>(null);

  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  // groupId -> selected optionIds
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setItem(null);

    (async () => {
      const res = await fetch(`/api/items/${itemId}`, { cache: "no-store" });
      const text = await res.text();

      if (!res.ok) {
        // Make it obvious in console what happened
        console.error("Item fetch failed", res.status, text);
        throw new Error(text);
      }

      const data = JSON.parse(text) as ApiItem | ApiError;

      if ("error" in data) {
        // If your API returns NOT_FOUND or Proxy failed
        console.warn("API returned error:", data);
        setNotFound(true);
        return;
      }

      // ensure itemOptionGroups exists
      const safe: ApiItem = {
        ...data,
        itemOptionGroups: Array.isArray(data.itemOptionGroups) ? data.itemOptionGroups : [],
      };

      setItem(safe);

      // defaults
      const defaults: Record<string, string[]> = {};
      for (const entry of safe.itemOptionGroups) {
        const g = entry.group;
        const options = Array.isArray(g.options) ? g.options : [];

        const def = options.filter((o: Option) => o.isDefault).map((o: Option) => o.id);

        if (g.type === "SINGLE") {
          if (def.length > 0) defaults[g.id] = [def[0]];
          else if (options.length > 0) defaults[g.id] = [options[0].id];
        } else {
          defaults[g.id] = def;
        }
      }
      setSelected(defaults);
    })()
      .catch((e) => {
        alert(`Failed to load item. Check console.\n\n${e?.message ?? e}`);
      })
      .finally(() => setLoading(false));
  }, [itemId]);

  const groups = useMemo(
    () => item?.itemOptionGroups?.map((x: { group: Group }) => x.group) ?? [],
    [item]
  );

  function toggle(group: Group, optionId: string) {
    setSelected((prev) => {
      const cur = prev[group.id] ?? [];

      if (group.type === "SINGLE") {
        const isCurrentlySelected = cur.includes(optionId);
        if (group.minSelect === 0 && isCurrentlySelected) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [optionId] };
      }

      // MULTI
      const exists = cur.includes(optionId);
      let next = exists ? cur.filter((x: string) => x !== optionId) : [...cur, optionId];

      if (group.maxSelect > 0 && next.length > group.maxSelect) {
        next = next.slice(next.length - group.maxSelect);
      }

      return { ...prev, [group.id]: next };
    });
  }

  function addToCart() {
    if (!item) return;

    const opts: CartOption[] = [];
    for (const g of groups) {
      const sel = selected[g.id] ?? [];
      for (const oid of sel) {
        const o = g.options.find((x: Option) => x.id === oid);
        if (!o) continue;
        opts.push({
          optionId: o.id,
          name: o.name,
          priceDelta: o.priceDelta,
          groupName: g.name,
        });
      }
    }

    const line: CartLine = {
      lineId: crypto.randomUUID(),
      itemId: item.id,
      name: item.name,
      qty,
      basePrice: item.basePrice,
      options: opts,
      note: note.trim() ? note.trim() : undefined,
    };

    const cart = loadCart();
    cart.push(line);
    saveCart(cart);

    alert("Added to cart!");
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  if (notFound) {
    return (
      <main style={{ padding: 24 }}>
        <p>
          <a href={`/t/${tableId}`}>← Back to menu</a>
        </p>
        <h2>Item not found</h2>
        <p style={{ opacity: 0.7 }}>
          Tip: open <code>/api/items/{itemId}</code> to see what the server returned.
        </p>
      </main>
    );
  }

  if (!item) {
    return <main style={{ padding: 24 }}>No item data.</main>;
  }

  return (
    <main style={{ padding: 24 }}>
      <p>
        <a href={`/t/${tableId}`}>← Back to menu</a> · <a href="/cart">Cart</a>
      </p>

      <h1>{item.name}</h1>
      <p>₱{(item.basePrice / 100).toFixed(2)}</p>

      {groups.map((g: Group) => (
        <section key={g.id} style={{ marginTop: 16 }}>
          <h3>{g.name}</h3>
          <ul>
            {g.options.map((o: Option) => {
              const checked = (selected[g.id] ?? []).includes(o.id);
              return (
                <li key={o.id}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type={g.type === "SINGLE" ? "radio" : "checkbox"}
                      name={g.id}
                      checked={checked}
                      onChange={() => toggle(g, o.id)}
                    />{" "}
                    {o.name}
                    {o.priceDelta !== 0 && (
                      <span> (+₱{(o.priceDelta / 100).toFixed(2)})</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section style={{ marginTop: 16 }}>
        <h3>Notes</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={150}
          rows={3}
          style={{ width: "100%" }}
          placeholder="Any notes for this item?"
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Quantity</h3>
        <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
        <span style={{ margin: "0 12px" }}>{qty}</span>
        <button onClick={() => setQty((q) => q + 1)}>+</button>
      </section>

      <button style={{ marginTop: 20, padding: "10px 14px" }} onClick={addToCart}>
        Add to cart
      </button>
    </main>
  );
}
