"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type Item = {
  id: string;
  name: string;
  basePrice: number;
  description?: string | null;
};

type ItemDetail = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  isDrink?: boolean;
  serveVessel?: string | null;
  defaultSizeOptionId?: string | null;
  hasSizes?: boolean;
  sizesByMode?: {
    HOT: Array<{ id: string; name: string; priceCents?: number }>;
    ICED: Array<{ id: string; name: string; priceCents?: number }>;
    CONCENTRATED: Array<{ id: string; name: string; priceCents?: number }>;
  };
  itemOptionGroups: Array<{
    group: {
      id: string;
      name: string;
      type: "SINGLE" | "MULTI";
      minSelect: number;
      maxSelect: number;
      isRequired: boolean;
      isSizeGroup?: boolean;
      options: Array<{
        id: string;
        name: string;
        priceDelta: number;
        isDefault: boolean;
      }>;
    };
  }>;
};

type CartItem = {
  tempId: string;
  itemId: string;
  itemName: string;
  basePrice: number;
  qty: number;
  note: string;
  baseType?: "HOT" | "ICED" | "CONCENTRATED";
  sizeLabel?: string;
  sizePriceCents?: number;
  selectedOptions: Array<{
    id: string;
    name: string;
    groupName: string;
    priceDelta: number;
  }>;
};

type Transaction = {
  id: string;
  transactionNo: number;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  lineItems: Array<{
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    modifiersCents: number;
    lineTotal: number;
    note?: string | null;
    optionsJson?: string | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    status: string;
  }>;
};

export default function PosCartClient() {
  const [menu, setMenu] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPesos, setDiscountPesos] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Item selection modal
  const [selectingItem, setSelectingItem] = useState<ItemDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [selectedBaseType, setSelectedBaseType] = useState<"HOT" | "ICED" | "CONCENTRATED" | null>(null);
  const [selectedSizeOption, setSelectedSizeOption] = useState<{ id: string; name: string } | null>(null);
  const [itemNote, setItemNote] = useState("");

  // Checkout flow
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "CARD">("CASH");
  const [paymentAmountPesos, setPaymentAmountPesos] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      setLoading(true);
      const res = await fetch("/api/menu", { cache: "no-store" });
      const data = await res.json();
      setMenu(data);
      if (data.length > 0) setSelectedCategory(data[0].id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openItemSelector(itemId: string) {
    try {
      const res = await fetch(`/api/items/${itemId}`, { cache: "no-store" });
      const item: ItemDetail = await res.json();
      setSelectingItem(item);
      setSelectedBaseType(null);
      setSelectedSizeOption(null);
      // Pre-select defaults (only for non-size option groups when item has no sizes)
      const defaults: Record<string, string[]> = {};
      if (!item.hasSizes) {
        item.itemOptionGroups.forEach(({ group }) => {
          const defaultOpts = group.options.filter((o) => o.isDefault).map((o) => o.id);
          if (defaultOpts.length > 0) {
            defaults[group.id] = defaultOpts;
          }
        });
      }
      setSelectedOptions(defaults);
      setItemNote("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  function toggleOption(groupId: string, optionId: string, groupType: "SINGLE" | "MULTI") {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (groupType === "SINGLE") {
        return { ...prev, [groupId]: [optionId] };
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  }

  function addToCart() {
    if (!selectingItem) return;

    // When item has sizes, user must select base type + size
    if (selectingItem.hasSizes && selectingItem.sizesByMode) {
      if (!selectedBaseType || !selectedSizeOption) return;
      const selectedPrices =
        selectingItem.sizesByMode[selectedBaseType]?.find(
          (s) => s.id === selectedSizeOption.id
        )?.priceCents ?? null;
      const unitPrice = selectedPrices ?? selectingItem.basePrice;
      const newItem: CartItem = {
        tempId: `${Date.now()}-${Math.random()}`,
        itemId: selectingItem.id,
        itemName: selectingItem.name,
        basePrice: unitPrice,
        qty: 1,
        note: itemNote.trim(),
        baseType: selectedBaseType,
        sizeLabel: selectedSizeOption.name,
        sizePriceCents: unitPrice,
        selectedOptions: [
          {
            id: selectedSizeOption.id,
            name: selectedSizeOption.name,
            groupName: selectedBaseType,
            priceDelta: 0,
          },
        ],
      };
      setCart((prev) => [...prev, newItem]);
      setSelectingItem(null);
      setSelectedOptions({});
      setSelectedBaseType(null);
      setSelectedSizeOption(null);
      setItemNote("");
      return;
    }

    const opts: CartItem["selectedOptions"] = [];
    selectingItem.itemOptionGroups.forEach(({ group }) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          opts.push({
            id: opt.id,
            name: opt.name,
            groupName: group.name,
            priceDelta: opt.priceDelta,
          });
        }
      });
      if (
        group.isSizeGroup &&
        selected.length === 0 &&
        selectingItem.defaultSizeOptionId &&
        !selectingItem.hasSizes
      ) {
        const defaultOpt = group.options.find(
          (o) => o.id === selectingItem.defaultSizeOptionId
        );
        if (defaultOpt) {
          opts.push({
            id: defaultOpt.id,
            name: defaultOpt.name,
            groupName: group.name,
            priceDelta: defaultOpt.priceDelta,
          });
        }
      }
    });

    const newItem: CartItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      itemId: selectingItem.id,
      itemName: selectingItem.name,
      basePrice: selectingItem.basePrice,
      qty: 1,
      note: itemNote.trim(),
      selectedOptions: opts,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectingItem(null);
    setSelectedOptions({});
    setItemNote("");
  }

  function updateQty(tempId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.tempId === tempId ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  }

  function removeFromCart(tempId: string) {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  function calculateLineTotal(item: CartItem) {
    const modifiers = item.selectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0);
    return (item.basePrice + modifiers) * item.qty;
  }

  function calculateSubtotal() {
    return cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  }

  function calculateTotal() {
    const subtotal = calculateSubtotal();
    const discount = Math.round((parseFloat(discountPesos) || 0) * 100);
    return Math.max(0, subtotal - discount);
  }

  async function handleCheckout() {
    if (cart.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const discountCents = Math.round((parseFloat(discountPesos) || 0) * 100);
      const items = cart.map((item) => ({
        itemId: item.itemId,
        qty: item.qty,
        optionIds: item.selectedOptions.map((o) => o.id),
        note: item.note || undefined,
        baseType: item.baseType || undefined,
        sizeLabel: item.sizeLabel || undefined,
      }));

      const res = await fetch("/api/pos/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, discountCents }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create sale");
        return;
      }

      setCurrentTransaction(data);
      setShowPaymentModal(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addPayment() {
    if (!currentTransaction) return;

    setBusy(true);
    setError(null);

    try {
      const amountCents = Math.round((parseFloat(paymentAmountPesos) || 0) * 100);
      if (amountCents <= 0) {
        setError("Payment amount must be greater than 0");
        return;
      }

      const res = await fetch(`/api/pos/transactions/${currentTransaction.id}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: paymentMethod, amountCents }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add payment");
        return;
      }

      // Reload sale to get updated payments
      const transactionRes = await fetch(`/api/pos/transactions/${currentTransaction.id}/receipt`, { cache: "no-store" });
      const updatedTransaction = await transactionRes.json();
      setCurrentTransaction(updatedTransaction);
      setPaymentAmountPesos("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function getTotalPaid() {
    if (!currentTransaction) return 0;
    return currentTransaction.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amountCents, 0);
  }

  function isFullyPaid() {
    return currentTransaction && getTotalPaid() >= currentTransaction.totalCents;
  }

  function startNewSale() {
    setCurrentTransaction(null);
    setShowPaymentModal(false);
    setCart([]);
    setDiscountPesos("");
    setPaymentMethod("CASH");
    setPaymentAmountPesos("");
    setError(null);
  }

  function formatPesos(cents: number) {
    return `₱${(cents / 100).toFixed(2)}`;
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>POS - Cart & Checkout</h1>
        <p>Loading menu...</p>
      </main>
    );
  }

  const currentCategory = menu.find((c) => c.id === selectedCategory);

  return (
    <main style={{ padding: 24 }}>
      <h1>POS - Cart & Checkout</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", border: "1px solid #c00", borderRadius: 4 }}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12 }}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        {/* LEFT: Categories & Items */}
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
          <h2>Menu</h2>
          <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {menu.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                disabled={selectedCategory === cat.id}
                style={{ padding: "8px 12px", textTransform: "capitalize" }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {currentCategory?.items.map((item) => (
              <button
                key={item.id}
                onClick={() => openItemSelector(item.id)}
                style={{
                  padding: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  textAlign: "left",
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 14, color: "#666" }}>{formatPesos(item.basePrice)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* MIDDLE: Cart */}
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
          <h2>Cart ({cart.length})</h2>
          {cart.length === 0 ? (
            <p style={{ color: "#999" }}>Cart is empty</p>
          ) : (
            <div>
              {cart.map((item) => (
                <div
                  key={item.tempId}
                  style={{ padding: 12, marginBottom: 8, border: "1px solid #eee", borderRadius: 4 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <strong>{item.itemName}</strong>
                      {item.baseType != null && item.sizeLabel != null && (
                        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                          {item.baseType.charAt(0) + item.baseType.slice(1).toLowerCase()} {item.sizeLabel}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeFromCart(item.tempId)} style={{ color: "red" }}>
                      ✕
                    </button>
                  </div>

                  {item.selectedOptions.length > 0 && !(item.baseType != null && item.sizeLabel != null) && (
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      {item.selectedOptions.map((opt, i) => (
                        <div key={i}>
                          • {opt.groupName}: {opt.name}
                          {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.note && (
                    <div style={{ fontSize: 13, fontStyle: "italic", marginBottom: 8 }}>Note: {item.note}</div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={() => updateQty(item.tempId, -1)}>−</button>
                      <span style={{ minWidth: 30, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.tempId, 1)}>+</button>
                    </div>
                    <strong>{formatPesos(calculateLineTotal(item))}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Totals & Checkout */}
        <div style={{ width: 300, border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
          <h2>Totals</h2>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Subtotal:</span>
              <strong>{formatPesos(calculateSubtotal())}</strong>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Discount (₱):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountPesos}
                onChange={(e) => setDiscountPesos(e.target.value)}
                placeholder="0.00"
                style={{ width: "100%", padding: 8 }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: "bold",
                paddingTop: 8,
                borderTop: "2px solid #000",
              }}
            >
              <span>TOTAL:</span>
              <span>{formatPesos(calculateTotal())}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || busy}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 16,
              fontWeight: "bold",
              background: cart.length === 0 ? "#ccc" : "#0a0",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Processing..." : "Checkout"}
          </button>
        </div>
      </div>

      {/* Item Selection Modal */}
      {selectingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectingItem(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {selectingItem.imageUrl ? (
                <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 8, overflow: "hidden", background: "#eee" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectingItem.imageUrl} alt={selectingItem.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : null}
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: "0 0 8px 0" }}>{selectingItem.name}</h2>
                <p style={{ fontSize: 18, margin: 0 }}>Base: {formatPesos(selectingItem.basePrice)}</p>
              </div>
            </div>

            {selectingItem.hasSizes && selectingItem.sizesByMode ? (
              <>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Choose base type and size</p>
                {(["HOT", "ICED", "CONCENTRATED"] as const).map((mode) => {
                  const sizes = selectingItem.sizesByMode![mode];
                  if (!sizes || sizes.length === 0) return null;
                  return (
                    <div key={mode} style={{ marginBottom: 16 }}>
                      <h3 style={{ marginBottom: 8 }}>{mode.charAt(0) + mode.slice(1).toLowerCase()}</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {sizes.map((opt) => {
                          const isSelected = selectedBaseType === mode && selectedSizeOption?.id === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedBaseType(mode);
                                setSelectedSizeOption({ id: opt.id, name: opt.name });
                              }}
                              style={{
                                padding: "8px 12px",
                                border: `2px solid ${isSelected ? "#00a" : "#ddd"}`,
                                borderRadius: 4,
                                background: isSelected ? "#eef" : "#fff",
                                cursor: "pointer",
                                fontWeight: isSelected ? "bold" : "normal",
                              }}
                            >
                              {opt.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
            {selectingItem.itemOptionGroups.map(({ group }) => (
              <div key={group.id} style={{ marginBottom: 16 }}>
                <h3>
                  {group.name} {group.isRequired && <span style={{ color: "red" }}>*</span>}
                </h3>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  {group.type === "SINGLE" ? "Choose one" : `Choose up to ${group.maxSelect}`}
                </p>

                {group.options.map((opt) => {
                  const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: "block",
                        padding: 8,
                        marginBottom: 4,
                        border: `1px solid ${isSelected ? "#00a" : "#ddd"}`,
                        borderRadius: 4,
                        cursor: "pointer",
                        background: isSelected ? "#eef" : "#fff",
                      }}
                    >
                      <input
                        type={group.type === "SINGLE" ? "radio" : "checkbox"}
                        checked={isSelected}
                        onChange={() => toggleOption(group.id, opt.id, group.type)}
                        style={{ marginRight: 8 }}
                      />
                      {opt.name}
                      {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                    </label>
                  );
                })}
              </div>
            ))}
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <strong>Note (optional):</strong>
              </label>
              <input
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g., Extra hot"
                style={{ width: "100%", padding: 8 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={addToCart}
                disabled={selectingItem.hasSizes ? !selectedBaseType || !selectedSizeOption : false}
                style={{ flex: 1, padding: "10px 16px", background: "#0a0", color: "#fff", border: "none", borderRadius: 4 }}
              >
                Add to Cart
              </button>
              <button
                onClick={() => setSelectingItem(null)}
                style={{ padding: "10px 16px", background: "#ccc", border: "none", borderRadius: 4 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && currentTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            {isFullyPaid() ? (
              <>
                <h2 style={{ color: "#0a0" }}>✓ Transaction Complete!</h2>
                <div style={{ marginBottom: 16 }}>
                  <p>
                    <strong>Transaction #:</strong> {currentTransaction.transactionNo}
                  </p>
                  <p>
                    <strong>Total:</strong> {formatPesos(currentTransaction.totalCents)}
                  </p>
                  <p>
                    <strong>Paid:</strong> {formatPesos(getTotalPaid())}
                  </p>
                </div>

                <h3>Line Items:</h3>
                {currentTransaction.lineItems.map((line) => (
                  <div key={line.id} style={{ padding: 8, marginBottom: 8, border: "1px solid #eee" }}>
                    <div>
                      <strong>
                        {line.qty}× {line.name}
                      </strong>
                    </div>
                    {line.optionsJson && (
                      <div style={{ fontSize: 13, color: "#666" }}>
                        {(JSON.parse(line.optionsJson) as any[]).map((opt: any, i: number) => (
                          <div key={i}>
                            • {opt.type === "size" && opt.baseType && opt.sizeLabel
                              ? `${(opt.baseType as string).charAt(0) + (opt.baseType as string).slice(1).toLowerCase()} ${opt.sizeLabel}`
                              : `${opt.group ?? ""}: ${opt.name ?? ""}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {line.note && <div style={{ fontSize: 13, fontStyle: "italic" }}>Note: {line.note}</div>}
                    <div style={{ textAlign: "right" }}>{formatPesos(line.lineTotal)}</div>
                  </div>
                ))}

                <h3>Payments:</h3>
                {currentTransaction.payments.map((pmt) => (
                  <div key={pmt.id} style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
                    <span>{pmt.method}</span>
                    <strong>{formatPesos(pmt.amountCents)}</strong>
                  </div>
                ))}

                <button
                  onClick={startNewSale}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginTop: 16,
                    fontSize: 16,
                    fontWeight: "bold",
                    background: "#00a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                  }}
                >
                  New Transaction
                </button>
              </>
            ) : (
              <>
                <h2>Payment</h2>
                <div style={{ marginBottom: 16 }}>
                  <p>
                    <strong>Transaction #:</strong> {currentTransaction.transactionNo}
                  </p>
                  <p>
                    <strong>Total:</strong> {formatPesos(currentTransaction.totalCents)}
                  </p>
                  <p>
                    <strong>Paid:</strong> {formatPesos(getTotalPaid())}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: "bold", color: "#c00" }}>
                    <strong>Remaining:</strong> {formatPesos(currentTransaction.totalCents - getTotalPaid())}
                  </p>
                </div>

                {currentTransaction.payments.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3>Payments Received:</h3>
                    {currentTransaction.payments.map((pmt) => (
                      <div key={pmt.id} style={{ display: "flex", justifyContent: "space-between", padding: 4 }}>
                        <span>{pmt.method}</span>
                        <strong>{formatPesos(pmt.amountCents)}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    <strong>Payment Method:</strong>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    style={{ width: "100%", padding: 8, fontSize: 16 }}
                  >
                    <option value="CASH">Cash</option>
                    <option value="GCASH">GCash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    <strong>Amount (₱):</strong>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmountPesos}
                    onChange={(e) => setPaymentAmountPesos(e.target.value)}
                    placeholder="0.00"
                    style={{ width: "100%", padding: 8, fontSize: 16 }}
                  />
                </div>

                <button
                  onClick={addPayment}
                  disabled={busy}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 16,
                    fontWeight: "bold",
                    background: "#0a0",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                  }}
                >
                  {busy ? "Processing..." : "Add Payment"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
