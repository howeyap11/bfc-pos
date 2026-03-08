"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { apiFetch, InvalidStaffKeyError } from "@/lib/apiFetch";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";
import { buildTxLineInputs } from "@/lib/buildTransactionPayload";

/**
 * POS Register Client Component
 * 
 * POS payment methods (configurable per store):
 * - CASH, CARD, GCASH, FOODPANDA, GRABFOOD, BFCAPP
 * 
 * These are for DIRECT SALES at the register only.
 * 
 * Note: QR orders use different payment methods (CASH/PAYMONGO only).
 * QR orders are processed separately and do not use this payment UI.
 * 
 * Payment method configuration is stored in StoreConfig and can be
 * modified via Settings → Payment Modes (Admin PIN required).
 */

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type MilkType = "FULL_CREAM" | "OAT" | "ALMOND" | "SOY";
type ShotsPricingMode = "ESPRESSO_FREE2_PAIR40" | "PAIR40_NO_FREE";
type ShotsDefaultSource = "MANUAL" | "INVENTORY";

type Item = {
  id: string;
  name: string;
  series?: string | null;
  basePrice: number;
  description?: string | null;
  foodpandaSurchargeCents?: number;
  defaultMilk?: MilkType;
  supportsShots?: boolean;
  isEspressoDrink?: boolean;
  shotsPricingMode?: ShotsPricingMode | null;
  defaultShots12oz?: number;
  defaultShots16oz?: number;
  shotsDefaultSource?: ShotsDefaultSource;
  // Legacy field (deprecated)
  defaultEspressoShots?: number;
};

type ItemDetail = {
  id: string;
  name: string;
  basePrice: number;
  foodpandaSurchargeCents?: number;
  defaultMilk?: MilkType;
  supportsShots?: boolean;
  isEspressoDrink?: boolean;
  shotsPricingMode?: ShotsPricingMode | null;
  defaultShots12oz?: number;
  defaultShots16oz?: number;
  shotsDefaultSource?: ShotsDefaultSource;
  // Legacy field (deprecated)
  defaultEspressoShots?: number;
  itemOptionGroups: Array<{
    group: {
      id: string;
      name: string;
      type: "SINGLE" | "MULTI";
      minSelect: number;
      maxSelect: number;
      isRequired: boolean;
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
  selectedOptions: Array<{
    id: string;
    name: string;
    groupName: string;
    priceDelta: number;
  }>;
  // New fields for enhanced options
  milkChoice?: MilkType; // Selected milk type
  defaultMilk?: MilkType; // Item's default milk (for comparison)
  shotsQty?: number; // Espresso shots quantity
  defaultShotsForSize?: number; // Default shots for selected size (for comparison)
  shotsUpchargeCents?: number; // Espresso shots upcharge (snapshot)
  fulfillment: "FOR_HERE" | "TAKE_OUT" | "FOODPANDA"; // Per-line fulfillment
  optionTotalCents: number; // Sum of all option price deltas
  surchargeCents: number; // Per-line surcharge (e.g., ₱20 for FOODPANDA)
  // Existing discount fields
  discountPct: number;
  discountAmount: number;
  discountTag?: "SNR" | "PWD" | null; // Audit identifier for discount type
  note?: string;
};

// POS Payment Methods (for direct register sales only)
// Note: QR orders use separate payment methods (CASH/PAYMONGO)
type PaymentMode = "CASH" | "CARD" | "GCASH" | "FOODPANDA" | "GRABFOOD" | "BFCAPP";

type SplitPaymentRow = {
  id: string;
  method: "CASH" | "CARD" | "GCASH";
  amountPesos: string;
};

type StoreConfig = {
  storeId: string;
  enabledPaymentMethods: PaymentMode[];
  splitPaymentEnabled: boolean;
  paymentMethodOrder: PaymentMode[] | null;
};

type Transaction = {
  id: string;
  transactionNo: number;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  serviceCents: number;
  status: string;
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

// Trash icon SVG component
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

// Split Payment icon SVG component (git branch / split icon)
function SplitPaymentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v6" />
      <path d="M18 9a9 9 0 0 0-9 9" />
    </svg>
  );
}

// Discount presets
const DISCOUNT_PRESETS = {
  SNR: 20,
  PWD: 20,
} as const;

// Staff Selector Modal Component (UTAK Style - Embedded in Cart)
function StaffSelectorModal({
  staffList,
  activeStaff,
  onLogin,
  onLogout,
  onClose,
  busy,
}: {
  staffList: Array<{ id: string; name: string; role: string; passcode: string; key: string }>;
  activeStaff: { id: string; name: string; role: string; staffKey: string } | null;
  onLogin: (staffId: string, passcode: string, staffName: string, staffRole: string) => void;
  onLogout: () => void;
  onClose: () => void;
  busy: string | null;
}) {
  const keyboard = useOnScreenKeyboard();
  const [passcodes, setPasscodes] = useState<Record<string, string>>({});

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1f1f1f",
          borderRadius: 12,
          width: "90%",
          maxWidth: 500,
          maxHeight: "80vh",
          overflow: "auto",
          border: "2px solid #3a3a3a",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "2px solid #3a3a3a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0a0a0a",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: "#fff" }}>Select Staff</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: 24,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Staff List */}
        <div style={{ padding: 16 }}>
          {activeStaff && (
            <div
              style={{
                padding: 16,
                background: "#22c55e",
                color: "#fff",
                borderRadius: 8,
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: "bold" }}>{activeStaff.name}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Currently Active ({activeStaff.role})</div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: "8px 16px",
                  background: "#fff",
                  color: "#22c55e",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: "bold",
                }}
              >
                Logout
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {staffList.map((staff) => {
              const isActive = activeStaff?.id === staff.id;

              return (
                <div
                  key={staff.id}
                  style={{
                    padding: 14,
                    background: "#2a2a2a",
                    border: isActive ? "2px solid #22c55e" : "1px solid #3a3a3a",
                    borderRadius: 8,
                    opacity: isActive ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: "600", marginBottom: 4, color: "#fff" }}>{staff.name}</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>{staff.role}</div>
                    </div>

                    {!isActive && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="password"
                          inputMode="none"
                          readOnly
                          placeholder="Tap for PIN"
                          value={passcodes[staff.id] || ""}
                          onClick={() => {
                            keyboard.openKeyboard({
                              mode: "pin",
                              value: passcodes[staff.id] || "",
                              title: `PIN for ${staff.name}`,
                              onChange: (val) => setPasscodes((prev) => ({ ...prev, [staff.id]: val })),
                              onDone: (val) => {
                                setPasscodes((prev) => ({ ...prev, [staff.id]: val }));
                                if (val) {
                                  onLogin(staff.id, val, staff.name, staff.role);
                                }
                              },
                            });
                          }}
                          disabled={busy === staff.id}
                          style={{
                            width: 100,
                            padding: "8px 10px",
                            background: "#1f1f1f",
                            border: "1px solid #3a3a3a",
                            borderRadius: 6,
                            color: "#fff",
                            fontSize: 13,
                            cursor: busy === staff.id ? "not-allowed" : "pointer",
                          }}
                        />
                        <button
                          onClick={() => onLogin(staff.id, passcodes[staff.id] || "", staff.name, staff.role)}
                          disabled={busy === staff.id}
                          style={{
                            padding: "8px 14px",
                            background: "#22c55e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: busy === staff.id ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {busy === staff.id ? "..." : "Login"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {staffList.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
              <p style={{ fontSize: 13 }}>No staff available</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Default passcodes:</p>
              <div style={{ fontSize: 12, marginTop: 12, color: "#666" }}>
                Andrea: 1000 | John: 1001 | Maria: 1002
              </div>
            </div>
          )}
        </div>
      </div>

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isOpen={keyboard.isOpen}
        mode={keyboard.mode}
        value={keyboard.value}
        title={keyboard.title}
        allowDecimal={keyboard.allowDecimal}
        onClose={keyboard.closeKeyboard}
        onValueChange={keyboard.updateValue}
        onDone={keyboard.handleDone}
      />
    </div>
  );
}

// Cart Item Editor Modal Component (UTAK Style)
function CartItemEditorModal({
  item,
  onSave,
  onClose,
  onRemove,
  formatPesos,
}: {
  item: CartItem;
  onSave: (updatedItem: CartItem) => void;
  onClose: () => void;
  onRemove: () => void;
  formatPesos: (cents: number) => string;
}) {
  const keyboard = useOnScreenKeyboard();
  
  const [qty, setQty] = useState(item.qty);
  const [discountPct, setDiscountPct] = useState(item.discountPct);
  const [discountAmount, setDiscountAmount] = useState(item.discountAmount);
  const [discountTag, setDiscountTag] = useState<"SNR" | "PWD" | null>(item.discountTag || null);
  const [note, setNote] = useState(item.note || "");

  // Calculate line subtotal (before discount)
  const unitPrice = item.basePrice + (item.optionTotalCents || 0);
  const lineSubtotal = unitPrice * qty;

  // Helper to round to 2 decimals
  const roundTo2 = (num: number) => Math.round(num * 100) / 100;

  // Update discount amount when percentage changes
  const handlePctChange = (newPct: number) => {
    const clampedPct = Math.max(0, Math.min(100, newPct));
    setDiscountPct(clampedPct);
    const newAmount = roundTo2((lineSubtotal / 100) * clampedPct);
    setDiscountAmount(Math.round(newAmount));
  };

  // Update discount percentage when amount changes
  const handleAmountChange = (newAmountCents: number) => {
    const clampedAmount = Math.max(0, Math.min(lineSubtotal, newAmountCents));
    setDiscountAmount(clampedAmount);
    if (lineSubtotal > 0) {
      const newPct = roundTo2((clampedAmount / lineSubtotal) * 100);
      setDiscountPct(Math.max(0, Math.min(100, newPct)));
    }
  };

  // Handle SNR/PWD button click
  const handleDiscountTag = (tag: "SNR" | "PWD") => {
    setDiscountTag(tag);
    handlePctChange(DISCOUNT_PRESETS[tag]); // Also set the discount percentage
  };

  // Clear discount
  const handleClearDiscount = () => {
    setDiscountPct(0);
    setDiscountAmount(0);
    setDiscountTag(null);
  };

  const handleSave = () => {
    onSave({
      ...item,
      qty,
      discountPct,
      discountAmount,
      discountTag,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  // Format modifiers for UTAK-style display
  const importantModifiers: string[] = [];
  const regularModifiers: string[] = [];

  // Add milk choice
  if (item.milkChoice) {
    const milkLabel = item.milkChoice === "FULL_CREAM" ? "Full Cream" : item.milkChoice === "OAT" ? "Oat Milk" : item.milkChoice === "ALMOND" ? "Almond Milk" : "Soy Milk";
    importantModifiers.push(milkLabel);
  }

  // Add shots if any
  if (item.shotsQty && item.shotsQty > 0) {
    importantModifiers.push(`${item.shotsQty} Shot${item.shotsQty > 1 ? "s" : ""}`);
  }

  // Add fulfillment
  const fulfillmentLabel = item.fulfillment === "FOR_HERE" ? "For Here" : item.fulfillment === "TAKE_OUT" ? "Take Out" : "Foodpanda";
  importantModifiers.push(fulfillmentLabel);

  item.selectedOptions.forEach((opt) => {
    const optName = opt.name.toUpperCase();
    const groupName = opt.groupName.toUpperCase();

    if (
      groupName.includes("TEMPERATURE") ||
      groupName.includes("SIZE") ||
      optName.includes("ICED") ||
      optName.includes("HOT") ||
      optName.includes("16OZ") ||
      optName.includes("22OZ") ||
      optName.includes("SMALL") ||
      optName.includes("MEDIUM") ||
      optName.includes("LARGE")
    ) {
      importantModifiers.push(opt.name);
    } else {
      regularModifiers.push(opt.name);
    }
  });

  const modifiersDisplay = [
    ...importantModifiers,
    ...regularModifiers,
  ].join(", ");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1f1f1f",
          borderRadius: 8,
          maxWidth: 500,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid #3a3a3a",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - UTAK Style */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #3a3a3a",
            background: "#2a2a2a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              BFC MENU
            </div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff", fontWeight: "bold", marginBottom: 4 }}>
              {item.itemName}
            </h2>
            {modifiersDisplay && (
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: "1.4" }}>
                {modifiersDisplay}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ fontSize: 16, color: "#4ade80", fontWeight: "bold" }}>
              {formatPesos(unitPrice)}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                fontSize: 20,
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Quantity - UTAK Style */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: "600", color: "#aaa", textTransform: "uppercase" }}>
              Quantity
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 50,
                  height: 50,
                  fontSize: 24,
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                −
              </button>
              <div
                style={{
                  width: 80,
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#fff",
                  background: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                }}
              >
                {qty}
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{
                  width: 50,
                  height: 50,
                  fontSize: 24,
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Discount Amount - UTAK Style Stacked */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: "600", color: "#aaa", textTransform: "uppercase" }}>
              Discount Amount
            </label>
            <input
              type="text"
              inputMode="none"
              readOnly
              value={(discountAmount / 100).toFixed(2)}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "numeric",
                  value: (discountAmount / 100).toFixed(2),
                  title: "Discount Amount (₱)",
                  allowDecimal: true,
                  onChange: (val) => handleAmountChange(Math.round((parseFloat(val) || 0) * 100)),
                  onDone: (val) => handleAmountChange(Math.round((parseFloat(val) || 0) * 100)),
                });
              }}
              placeholder="Tap to enter"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 16,
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* Discount Percentage - UTAK Style Stacked */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: "600", color: "#aaa", textTransform: "uppercase" }}>
              Discount Percentage
            </label>
            <input
              type="text"
              inputMode="none"
              readOnly
              value={discountPct}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "numeric",
                  value: String(discountPct),
                  title: "Discount Percentage (%)",
                  allowDecimal: true,
                  onChange: (val) => handlePctChange(parseFloat(val) || 0),
                  onDone: (val) => handlePctChange(parseFloat(val) || 0),
                });
              }}
              placeholder="Tap to enter"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 16,
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* Discount Tag Buttons - UTAK Style */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => handleDiscountTag("SNR")}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: 14,
                fontWeight: "bold",
                background: discountTag === "SNR" ? COLORS.primary : "#2a2a2a",
                color: "#fff",
                border: discountTag === "SNR" ? `2px solid ${COLORS.primary}` : "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              SNR
            </button>
            <button
              onClick={() => handleDiscountTag("PWD")}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: 14,
                fontWeight: "bold",
                background: discountTag === "PWD" ? COLORS.primary : "#2a2a2a",
                color: "#fff",
                border: discountTag === "PWD" ? `2px solid ${COLORS.primary}` : "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              PWD
            </button>
            <button
              onClick={handleClearDiscount}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: 14,
                fontWeight: "bold",
                background: "#2a2a2a",
                color: "#ef4444",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <TrashIcon />
              Clear
            </button>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: "600", color: "#aaa", textTransform: "uppercase" }}>
              Note
            </label>
            <input
              type="text"
              inputMode="none"
              readOnly
              value={note}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "text",
                  value: note,
                  title: "Item Note",
                  onChange: setNote,
                  onDone: setNote,
                });
              }}
              placeholder="Tap to add note"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* Line Total Display */}
          {discountAmount > 0 && (
            <div
              style={{
                padding: 12,
                background: "#2a2a2a",
                borderRadius: 6,
                marginBottom: 20,
                border: "1px solid #3a3a3a",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "#aaa" }}>Subtotal:</span>
                <span style={{ color: "#fff" }}>{formatPesos(lineSubtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "#fb923c" }}>
                  Discount {discountTag && `(${discountTag})`} {discountPct > 0 && `${discountPct.toFixed(1)}%`}:
                </span>
                <span style={{ color: "#fb923c" }}>-{formatPesos(discountAmount)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: "bold",
                  paddingTop: 8,
                  borderTop: "1px solid #3a3a3a",
                }}
              >
                <span style={{ color: "#ddd" }}>Line Total:</span>
                <span style={{ color: "#4ade80" }}>{formatPesos(lineSubtotal - discountAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Buttons - UTAK Style */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #3a3a3a",
            background: "#2a2a2a",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={handleRemove}
            style={{
              padding: "14px 20px",
              fontSize: 15,
              fontWeight: "bold",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Remove
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "14px 20px",
              fontSize: 15,
              fontWeight: "bold",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Done
          </button>
        </div>
      </div>

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isOpen={keyboard.isOpen}
        mode={keyboard.mode}
        value={keyboard.value}
        title={keyboard.title}
        allowDecimal={keyboard.allowDecimal}
        onClose={keyboard.closeKeyboard}
        onValueChange={keyboard.updateValue}
        onDone={keyboard.handleDone}
      />
    </div>
  );
}

// Split Payment Modal Component (UTAK Style)
function SplitPaymentModal({
  totalCents,
  onClose,
  onCharge,
  formatPesos,
}: {
  totalCents: number;
  onClose: () => void;
  onCharge: (payments: Array<{ method: "CASH" | "CARD" | "GCASH"; amountCents: number }>) => void;
  formatPesos: (cents: number) => string;
}) {
  const keyboard = useOnScreenKeyboard();
  
  const [rows, setRows] = useState<SplitPaymentRow[]>([
    { id: "1", method: "CASH", amountPesos: "" },
    { id: "2", method: "CASH", amountPesos: "" },
  ]);

  const getTotalPaid = () => {
    return rows.reduce((sum, row) => {
      const amount = parseFloat(row.amountPesos) || 0;
      return sum + Math.round(amount * 100);
    }, 0);
  };

  const getRemaining = () => {
    return totalCents - getTotalPaid();
  };

  const canCharge = () => {
    const remaining = getRemaining();
    return Math.abs(remaining) <= 1; // Allow 1 cent rounding tolerance
  };

  const handleCharge = () => {
    if (!canCharge()) return;

    const payments = rows
      .filter((row) => parseFloat(row.amountPesos) > 0)
      .map((row) => ({
        method: row.method,
        amountCents: Math.round(parseFloat(row.amountPesos) * 100),
      }));

    onCharge(payments);
  };

  const updateRow = (id: string, field: keyof SplitPaymentRow, value: any) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: Date.now().toString(), method: "CASH", amountPesos: "" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1f1f1f",
          borderRadius: 12,
          width: "90%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid #3a3a3a",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #3a3a3a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#2a2a2a",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: "#fff" }}>Split Payment</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: 24,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Payment Rows */}
          {rows.map((row, idx) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <select
                  value={row.method}
                  onChange={(e) => updateRow(row.id, "method", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 14,
                    background: "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #3a3a3a",
                    borderRadius: 6,
                  }}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="GCASH">GCash</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  inputMode="none"
                  readOnly
                  value={row.amountPesos}
                  onClick={() => {
                    keyboard.openKeyboard({
                      mode: "numeric",
                      value: row.amountPesos,
                      title: `Amount (₱) - ${row.method}`,
                      allowDecimal: true,
                      onChange: (val) => updateRow(row.id, "amountPesos", val),
                      onDone: (val) => updateRow(row.id, "amountPesos", val),
                    });
                  }}
                  placeholder="Tap to enter"
                  style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 14,
                    textAlign: "right",
                    background: "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #3a3a3a",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                />
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  style={{
                    padding: 8,
                    background: "transparent",
                    color: "#ef4444",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}

          {/* Add Row Button */}
          <button
            onClick={addRow}
            style={{
              width: "100%",
              padding: 10,
              fontSize: 13,
              fontWeight: "bold",
              background: "transparent",
              color: COLORS.primary,
              border: `2px dashed ${COLORS.primary}`,
              borderRadius: 6,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            + Add Payment Method
          </button>

          {/* Summary */}
          <div
            style={{
              padding: 12,
              background: "#2a2a2a",
              borderRadius: 6,
              border: "1px solid #3a3a3a",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
              <span style={{ color: "#aaa" }}>Total:</span>
              <strong style={{ color: "#fff" }}>{formatPesos(totalCents)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
              <span style={{ color: "#aaa" }}>Paid:</span>
              <strong style={{ color: "#4ade80" }}>{formatPesos(getTotalPaid())}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontWeight: "bold",
                paddingTop: 8,
                borderTop: "1px solid #3a3a3a",
              }}
            >
              <span style={{ color: "#ddd" }}>Remaining:</span>
              <strong style={{ color: getRemaining() <= 0 ? "#4ade80" : "#ef4444" }}>
                {formatPesos(Math.abs(getRemaining()))}
              </strong>
            </div>
          </div>

          {/* Charge Button */}
          <button
            onClick={handleCharge}
            disabled={!canCharge()}
            style={{
              width: "100%",
              padding: 16,
              fontSize: 16,
              fontWeight: "bold",
              background: canCharge() ? "#10b981" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: canCharge() ? "pointer" : "not-allowed",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {canCharge() ? "Charge" : `Remaining: ${formatPesos(getRemaining())}`}
          </button>
        </div>
      </div>

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isOpen={keyboard.isOpen}
        mode={keyboard.mode}
        value={keyboard.value}
        title={keyboard.title}
        allowDecimal={keyboard.allowDecimal}
        onClose={keyboard.closeKeyboard}
        onValueChange={keyboard.updateValue}
        onDone={keyboard.handleDone}
      />
    </div>
  );
}

/**
 * Shared formatter for line item modifiers (UTAK style)
 * Used by both cart items and success screen items
 */
function formatLineItemModifiers(item: CartItem) {
  const primaryParts: string[] = []; // Bold/prominent (size, temp)
  const secondaryParts: string[] = []; // Regular text (milk sub, shots, extras)
  
  // Extract size and temperature from selectedOptions
  let sizeText = "";
  let tempText = "";
  const otherOptions: string[] = [];
  
  item.selectedOptions?.forEach((opt) => {
    const optName = opt.name.toUpperCase();
    const groupName = opt.groupName?.toUpperCase() || "";
    
    // Temperature
    if (groupName.includes("TEMPERATURE") || optName.includes("ICED") || optName.includes("HOT")) {
      tempText = opt.name;
    }
    // Size
    else if (groupName.includes("SIZE") || optName.includes("OZ") || optName.includes("SMALL") || optName.includes("MEDIUM") || optName.includes("LARGE")) {
      sizeText = opt.name;
    }
    // Other modifiers
    else {
      otherOptions.push(opt.name);
    }
  });
  
  // 1) Primary: Size + Temperature (always bold)
  if (sizeText) primaryParts.push(sizeText);
  if (tempText) primaryParts.push(tempText);
  
  // 2) Milk: Only show if substituted from default
  if (item.milkChoice && item.defaultMilk && item.milkChoice !== item.defaultMilk) {
    const milkLabel = item.milkChoice === "FULL_CREAM" ? "full cream" : 
                      item.milkChoice === "OAT" ? "oatmilk" : 
                      item.milkChoice === "ALMOND" ? "almond" : "soy";
    secondaryParts.push(`sub ${milkLabel}`);
  }
  
  // 3) Shots: Always show if item supports shots
  // Bold only if different from default
  if (item.shotsQty !== undefined && item.shotsQty >= 0) {
    const shotsText = `${item.shotsQty} shot${item.shotsQty !== 1 ? "s" : ""}`;
    const isDefault = item.defaultShotsForSize !== undefined && item.shotsQty === item.defaultShotsForSize;
    
    if (isDefault) {
      secondaryParts.push(shotsText);
    } else {
      // Non-default shots - add to secondary but will be styled bold
      secondaryParts.push(`**${shotsText}**`); // Marker for bold styling
    }
  }
  
  // 4) Other modifiers (syrups, extras)
  otherOptions.forEach(opt => secondaryParts.push(opt));
  
  // 5) Fulfillment
  const fulfillmentLabel = item.fulfillment === "FOR_HERE" ? "For Here" : 
                           item.fulfillment === "TAKE_OUT" ? "Take Out" : "Foodpanda";
  
  return {
    primaryText: primaryParts.join(" "), // e.g., "16oz ICED"
    secondaryParts, // e.g., ["sub oatmilk", "2 shots", "Vanilla Syrup"]
    fulfillmentLabel,
    fulfillmentColor: item.fulfillment === "FOR_HERE" ? "#10b981" : 
                      item.fulfillment === "TAKE_OUT" ? "#f59e0b" : "#ec4899",
  };
}

// Cart Line Item Component (UTAK Style)
function CartLineItem({
  item,
  onRemove,
  onClick,
  formatPesos,
  calculateLineTotal,
}: {
  item: CartItem;
  onRemove: () => void;
  onClick: () => void;
  formatPesos: (cents: number) => string;
  calculateLineTotal: (item: CartItem) => number;
}) {
  // Use shared formatter
  const { primaryText, secondaryParts, fulfillmentLabel, fulfillmentColor } = formatLineItemModifiers(item);

  return (
    <div
      onClick={onClick}
      style={{
        padding: 10,
        marginBottom: 8,
        background: "#2a2a2a",
        border: "1px solid #3a3a3a",
        borderRadius: 6,
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#2a2a2a")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          {/* Item Name with Quantity and Fulfillment Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: "bold",
                background: COLORS.primary,
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 3,
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {item.qty}×
            </span>
            <strong style={{ fontSize: 13, color: "#fff", lineHeight: "1.2" }}>{item.itemName}</strong>
            {/* Fulfillment Badge */}
            <span
              style={{
                fontSize: 9,
                fontWeight: "bold",
                background: fulfillmentColor,
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 3,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {fulfillmentLabel}
            </span>
          </div>

          {/* Modifiers - UTAK Style: Size+Temp bold, rest comma-separated */}
          {(primaryText || secondaryParts.length > 0) && (
            <div style={{ fontSize: 11, lineHeight: "1.4", marginLeft: 26 }}>
              {primaryText && (
                <span style={{ color: "#fff", fontWeight: "600" }}>{primaryText}</span>
              )}
              {primaryText && secondaryParts.length > 0 && (
                <span style={{ color: "#888" }}>, </span>
              )}
              {secondaryParts.length > 0 && secondaryParts.map((part, i) => {
                // Check if this part should be bold (marked with **)
                const isBold = part.startsWith("**") && part.endsWith("**");
                const text = isBold ? part.slice(2, -2) : part;
                
                return (
                  <span key={i}>
                    {i > 0 && <span style={{ color: "#888" }}>, </span>}
                    <span style={{ 
                      color: isBold ? "#fff" : "#888",
                      fontWeight: isBold ? "600" : "normal"
                    }}>
                      {text}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Note */}
          {item.note && (
            <div style={{ fontSize: 11, color: "#fbbf24", marginLeft: 26, marginTop: 4, fontStyle: "italic" }}>
              Note: {item.note}
            </div>
          )}

          {/* Discount */}
          {item.discountAmount > 0 && (
            <div style={{ fontSize: 11, color: "#fb923c", marginLeft: 26, marginTop: 2 }}>
              {item.discountTag && <span style={{ fontWeight: "bold" }}>{item.discountTag} </span>}
              Discount: {item.discountPct.toFixed(0)}% (-{formatPesos(item.discountAmount)})
            </div>
          )}
        </div>

        {/* Price and Remove Button */}
        <div style={{ display: "flex", alignItems: "start", gap: 8, flexShrink: 0 }}>
          <strong style={{ fontSize: 14, color: "#4ade80", fontWeight: "600" }}>
            {formatPesos(calculateLineTotal(item))}
          </strong>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              color: "#ef4444",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PosRegisterClient() {
  const router = useRouter();
  
  // On-screen keyboard
  const keyboard = useOnScreenKeyboard();
  
  const [menu, setMenu] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tiles" | "items">("tiles"); // tiles = subcategory grid, items = item grid
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  // Register view state: BROWSE (category/items) or CUSTOMIZE (item config)
  const [registerView, setRegisterView] = useState<"BROWSE" | "CUSTOMIZE">("BROWSE");

  // Item configuration
  const [configuringItem, setConfiguringItem] = useState<ItemDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [configQty, setConfigQty] = useState(1);
  const [configMilk, setConfigMilk] = useState<MilkType>("FULL_CREAM");
  const [configShotsQty, setConfigShotsQty] = useState<number>(0);
  const [shotsTouchedByUser, setShotsTouchedByUser] = useState<boolean>(false); // Track manual shot changes
  const [configFulfillment, setConfigFulfillment] = useState<"FOR_HERE" | "TAKE_OUT" | "FOODPANDA">("FOR_HERE");
  const [configNote, setConfigNote] = useState<string>("");

  // Cart item editing
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Payment
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "CARD">("CASH");
  const [amountReceivedPesos, setAmountReceivedPesos] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  
  // Cart Panel State Machine
  const [cartPanelMode, setCartPanelMode] = useState<"CART" | "SUCCESS">("CART");
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState<{
    id: string;
    transactionNo: number;
    totalCents: number;
    method: string;
    items: CartItem[];
    createdAt: string;
    staffName?: string;
  } | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>("CASH");
  
  // QR Order tracking
  const [qrOrderId, setQrOrderId] = useState<string | null>(null);
  
  // Staff session
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; role: string; staffKey: string } | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string; passcode: string; key: string }>>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffBusy, setStaffBusy] = useState<string | null>(null);

  // Debug render logging
  console.log("[RENDER]", {
    cartPanelMode,
    cartLength: cart.length,
    lastCompletedTransaction,
    activeStaff: activeStaff ? { 
      id: activeStaff.id, 
      name: activeStaff.name,
      hasStaffKey: !!activeStaff.staffKey,
      staffKeyPreview: activeStaff.staffKey?.slice(0, 10)
    } : null
  });

  // Track activeStaff changes
  useEffect(() => {
    console.log("[STAFF] activeStaff state changed:", {
      hasActiveStaff: !!activeStaff,
      hasStaffKey: !!activeStaff?.staffKey,
      staffKeyPreview: activeStaff?.staffKey?.slice(0, 10),
      fullState: activeStaff,
    });
  }, [activeStaff]);

  useEffect(() => {
    loadMenu();
    loadStoreConfig();
    checkActiveStaff();
    loadStaffList();
    
    // Check if loading cart from QR order acceptance
    const urlParams = new URLSearchParams(window.location.search);
    const qrOrderId = urlParams.get("qrOrderId");
    if (qrOrderId) {
      loadCartFromQROrder(qrOrderId);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function checkActiveStaff() {
    try {
      const stored = localStorage.getItem("bfc_active_staff");
      console.log("[STAFF] checkActiveStaff - raw localStorage:", stored?.slice(0, 100));
      
      if (stored) {
        const staff = JSON.parse(stored);
        
        console.log("[STAFF] Loaded from localStorage", { 
          hasStaffKey: !!staff.staffKey,
          staffKeyPreview: staff.staffKey?.slice(0, 10),
          hasKey: !!staff.key,
          keyPreview: staff.key?.slice(0, 10),
          staff 
        });
        
        // Migration: if old format with 'key' instead of 'staffKey', migrate it
        if (staff.key && !staff.staffKey) {
          console.log("[STAFF] Migrating old format: key -> staffKey");
          staff.staffKey = staff.key;
          delete staff.key;
          localStorage.setItem("bfc_active_staff", JSON.stringify(staff));
        }
        
        // Validation: if no staffKey at all, clear and force re-login
        if (!staff.staffKey) {
          console.error("[STAFF] No staffKey in localStorage - clearing and forcing re-login");
          localStorage.removeItem("bfc_active_staff");
          setShowStaffModal(true);
          return;
        }
        
        console.log("[STAFF] staffKey present?", !!staff.staffKey);
        setActiveStaff(staff);
      }
    } catch (e) {
      console.error("[Staff] Failed to load active staff from localStorage", e);
      localStorage.removeItem("bfc_active_staff");
    }
  }

  async function loadStaffList() {
    try {
      console.log("[Staff] Loading staff list");
      const data = await fetchJson("/api/staff", { cache: "no-store" });
      
      if (Array.isArray(data)) {
        console.log("[Staff] Loaded", data.length, "staff members");
        console.log("[Staff] First staff sample:", {
          name: data[0]?.name,
          hasKey: !!data[0]?.key,
          keyPreview: data[0]?.key?.slice(0, 10)
        });
        setStaffList(data);
      } else if (data.fallback && Array.isArray(data.fallback)) {
        // Backend returned diagnostic error with fallback
        setStaffList(data.fallback);
        console.warn("[Staff] Using fallback staff list");
      } else {
        console.error("[Staff] Invalid staff data:", data);
        setStaffList([]);
      }
    } catch (e: any) {
      console.error("[Staff] Failed to load staff:", e);
      setStaffList([]);
    }
  }

  function handleStaffLogin(staffId: string, enteredPasscode: string, staffName: string, staffRole: string) {
    if (!enteredPasscode) {
      setError("Please enter passcode");
      return;
    }

    setStaffBusy(staffId);
    setError(null);

    // Find staff in list
    const staff = staffList.find((s) => s.id === staffId);
    
    if (!staff) {
      setError("Staff not found");
      setStaffBusy(null);
      return;
    }

    // Local PIN validation
    if (enteredPasscode !== staff.passcode) {
      setError("Invalid passcode");
      setStaffBusy(null);
      return;
    }

    // PIN is correct - save active staff (including staffKey for API authentication)
    const activeStaffData = { 
      id: staff.id, 
      name: staff.name, 
      role: staff.role, 
      staffKey: staff.key // Map DB field 'key' to 'staffKey' for consistency
    };
    
    console.log("[STAFF] Login successful", { 
      name: staff.name, 
      hasStaffKey: !!activeStaffData.staffKey,
      staffKeyPreview: activeStaffData.staffKey?.slice(0, 10)
    });
    
    try {
      const jsonString = JSON.stringify(activeStaffData);
      localStorage.setItem("bfc_active_staff", jsonString);
      console.log("[STAFF] Saved to localStorage:", jsonString.slice(0, 100));
    } catch (e) {
      console.error("[Staff] Failed to save to localStorage", e);
    }
    
    setActiveStaff(activeStaffData);
    setShowStaffModal(false);
    setError(null);
    setStaffBusy(null);
    
    console.log("[Staff] Login successful - activeStaff state set:", {
      name: staff.name,
      hasStaffKey: !!activeStaffData.staffKey,
      staffKeyPreview: activeStaffData.staffKey?.slice(0, 10),
    });
  }

  function handleStaffLogout() {
    try {
      localStorage.removeItem("bfc_active_staff");
    } catch (e) {
      console.error("[Staff] Failed to clear localStorage", e);
    }
    
    setActiveStaff(null);
    setShowStaffModal(false);
    setError(null);
    
    console.log("[Staff] Logged out");
  }

  // Helper: Require staff for payment actions
  /**
   * Ensures staff is logged in with valid staffKey before proceeding with action.
   * Opens staff modal if not authenticated.
   * Returns Promise<boolean> indicating if staff is authenticated.
   */
  async function requireStaffForPayment(): Promise<boolean> {
    if (!activeStaff || !activeStaff.staffKey) {
      console.warn("[requireStaffForPayment] No valid staff session - opening staff modal");
      setShowStaffModal(true);
      return false;
    }
    
    console.log("[requireStaffForPayment] Staff authenticated", {
      name: activeStaff.name,
      hasKey: !!activeStaff.staffKey,
    });
    return true;
  }

  /**
   * Legacy wrapper for backwards compatibility with non-async callers.
   */
  function requireStaffForPaymentSync(action: () => void | Promise<void>): void {
    if (!activeStaff || !activeStaff.staffKey) {
      setShowStaffModal(true);
      return;
    }
    action();
  }

  async function loadCartFromQROrder(orderId: string) {
    try {
      console.log("[QR Accept] Loading cart from order:", orderId);
      
      const data = await fetchJson(`/api/qr/orders/${orderId}/accept`, {
        method: "POST",
      });
      
      if (data.kind === "PAYMONGO_DONE") {
        // PAYMONGO flow: Transaction already created, navigate to success screen
        console.log("[QR Accept] PAYMONGO order accepted, transaction created:", data.transactionId);
        
        // Navigate to transaction success screen
        router.push(`/pos/transaction-success?transactionId=${data.transactionId}`);
      } else if (data.kind === "CASH_PENDING") {
        // CASH flow: Load items into cart for cashier to process
        console.log("[QR Accept] CASH order accepted, loading cart:", data.cartPayload);
        
        const cartItems: CartItem[] = data.cartPayload.map((item: any) => ({
          tempId: `qr-${Date.now()}-${Math.random()}`,
          itemId: item.itemId,
          itemName: item.itemName,
          basePrice: item.basePrice,
          qty: item.qty,
          selectedOptions: item.selectedOptions.map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            groupName: "", // Not provided in payload
            priceDelta: opt.priceDelta,
          })),
          discountPct: 0,
          discountAmount: 0,
          discountTag: null,
          note: item.note || "",
        }));
        
        setCart(cartItems);
        setQrOrderId(data.orderId); // Track QR order for later linking
        
        // Show info message
        alert(`Order #${data.orderNo} loaded into cart. Please process payment.`);
      }
    } catch (e: any) {
      console.error("[QR Accept] Error:", e);
      setError(e?.message ?? String(e));
    }
  }

  async function loadMenu() {
    try {
      setLoading(true);
      const data = await fetchJson("/api/menu", { cache: "no-store" });
      
      // Defensive check: ensure data is an array
      if (!Array.isArray(data)) {
        setError(data?.error || "Invalid menu data received");
        setMenu([]);
        return;
      }
      
      setMenu(data);
      if (data.length > 0) setSelectedCategory(data[0].id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }

  // Safe JSON fetch helper
  async function fetchJson(url: string, init?: RequestInit) {
    const staffKeyHeader = init?.headers ? (init.headers as any)["x-staff-key"] : undefined;
    console.log("[fetchJson] DEBUG", {
      url,
      hasStaffKeyHeader: !!staffKeyHeader,
      staffKeyPreview: staffKeyHeader ? `${staffKeyHeader.slice(0, 6)}...` : "NONE",
      allHeaders: init?.headers,
    });

    const res = await fetch(url, init);
    const text = await res.text();
    
    if (!res.ok) {
      console.error("[fetchJson] Request failed", {
        url,
        status: res.status,
        statusText: res.statusText,
        responsePreview: text.slice(0, 200),
      });

      // If 401 with "Invalid staff key", clear the stored staff and force re-login
      if (res.status === 401 && text.includes("Invalid staff key")) {
        console.error("[fetchJson] Invalid staff key detected - clearing session and forcing re-login");
        localStorage.removeItem("bfc_active_staff");
        setActiveStaff(null);
        setShowStaffModal(true);
        throw new Error("Staff session expired. Please log in again.");
      }
      throw new Error(`[${res.status}] ${res.statusText}: ${text.slice(0, 200)}`);
    }
    
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON from ${url}. First 120 chars: ${text.slice(0, 120)}`);
    }
  }

  async function loadStoreConfig() {
    const defaultConfig = {
      storeId: "store_1",
      enabledPaymentMethods: ["CASH", "CARD", "GCASH", "FOODPANDA"] as PaymentMode[],
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
    };

    try {
      console.log("[StoreConfig] Fetching from /api/store-config");
      const data = await fetchJson("/api/store-config", { cache: "no-store" });
      
      console.log("[StoreConfig] Loaded successfully:", data);
      setStoreConfig(data);
      setError(null); // Clear any previous errors
    } catch (e: any) {
      console.error("[StoreConfig] Failed to load:", e.message || e);
      
      // Show non-blocking warning
      const errorMsg = `Payment config unavailable (using defaults): ${e.message || String(e)}`;
      console.warn("[StoreConfig]", errorMsg);
      
      // Use default config so Register still works
      setStoreConfig(defaultConfig);
      
      // Optionally show a subtle warning in UI (non-blocking)
      // setError(errorMsg); // Uncomment if you want to show error banner
    }
  }

  async function openItemConfig(itemId: string) {
    // Defensive guard
    if (!itemId) {
      console.warn("[openItemConfig] No itemId provided");
      return;
    }

    try {
      const item: ItemDetail = await fetchJson(`/api/items/${itemId}`, { cache: "no-store" });
      
      // Defensive guard: verify item is valid
      if (!item || !item.id) {
        console.warn("[openItemConfig] Invalid item received:", item);
        setError("Failed to load item details");
        return;
      }

      setConfiguringItem(item);

      // Pre-select defaults
      const defaults: Record<string, string[]> = {};
      item.itemOptionGroups?.forEach(({ group }) => {
        const groupNameLower = group.name.toLowerCase();
        
        // Override defaults for Temperature and Size
        if (groupNameLower.includes("temperature")) {
          // Default to ICED
          const icedOption = group.options.find((o) => o.name.toLowerCase().includes("iced"));
          if (icedOption) {
            defaults[group.id] = [icedOption.id];
          } else {
            // Fallback to first option if ICED not found
            const defaultOpts = group.options.filter((o) => o.isDefault).map((o) => o.id);
            if (defaultOpts.length > 0) defaults[group.id] = defaultOpts;
          }
        } else if (groupNameLower.includes("size")) {
          // Default to 16oz
          const size16oz = group.options.find((o) => o.name.toLowerCase().includes("16") || o.name.toLowerCase().includes("16oz"));
          if (size16oz) {
            defaults[group.id] = [size16oz.id];
          } else {
            // Fallback to first option if 16oz not found
            const defaultOpts = group.options.filter((o) => o.isDefault).map((o) => o.id);
            if (defaultOpts.length > 0) defaults[group.id] = defaultOpts;
          }
        } else {
          // For other groups, use database defaults
          const defaultOpts = group.options.filter((o) => o.isDefault).map((o) => o.id);
          if (defaultOpts.length > 0) {
            defaults[group.id] = defaultOpts;
          }
        }
      });
      setSelectedOptions(defaults);
      setConfigQty(1);
      setConfigMilk(item.defaultMilk || "FULL_CREAM");
      
      // Determine initial shots based on selected size
      // Default size is 16oz (set above in defaults)
      const sizeGroupId = Object.keys(defaults).find((gid) => {
        const group = item.itemOptionGroups?.find((ig) => ig.group.id === gid);
        return group?.group.name.toLowerCase().includes("size");
      });
      
      let initialShots = 0;
      if (sizeGroupId && defaults[sizeGroupId]?.[0]) {
        const selectedSizeId = defaults[sizeGroupId][0];
        const sizeGroup = item.itemOptionGroups?.find((ig) => ig.group.id === sizeGroupId);
        const sizeOption = sizeGroup?.group.options.find((o) => o.id === selectedSizeId);
        const sizeName = sizeOption?.name.toLowerCase() || "";
        
        // Map size to default shots
        if (sizeName.includes("12") || sizeName.includes("12oz")) {
          initialShots = item.defaultShots12oz ?? 0;
        } else if (sizeName.includes("16") || sizeName.includes("16oz")) {
          initialShots = item.defaultShots16oz ?? 0;
        } else {
          // Fallback: use 16oz default or legacy field
          initialShots = item.defaultShots16oz ?? item.defaultEspressoShots ?? 0;
        }
      } else {
        // No size group or no selection: use 16oz default or legacy
        initialShots = item.defaultShots16oz ?? item.defaultEspressoShots ?? 0;
      }
      
      setConfigShotsQty(initialShots);
      setShotsTouchedByUser(false); // Reset touch tracking
      setConfigFulfillment("FOR_HERE"); // Changed default to FOR_HERE
      setConfigNote("");
      
      // Switch to CUSTOMIZE view
      setRegisterView("CUSTOMIZE");
    } catch (e: any) {
      console.error("[openItemConfig] Error:", e);
      setError(e?.message ?? String(e));
    }
  }
  
  function closeItemConfig() {
    setConfiguringItem(null);
    setSelectedOptions({});
    setConfigQty(1);
    setConfigMilk("FULL_CREAM");
    setConfigShotsQty(0);
    setShotsTouchedByUser(false); // Reset touch tracking
    setConfigFulfillment("FOR_HERE"); // Reset to FOR_HERE default
    setConfigNote("");
    
    // Switch back to BROWSE view
    setRegisterView("BROWSE");
  }

  function toggleOption(groupId: string, optionId: string, groupType: "SINGLE" | "MULTI") {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      let newSelection: Record<string, string[]>;
      
      if (groupType === "SINGLE") {
        newSelection = { ...prev, [groupId]: [optionId] };
      } else {
        if (current.includes(optionId)) {
          newSelection = { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        } else {
          newSelection = { ...prev, [groupId]: [...current, optionId] };
        }
      }
      
      // Auto-update shots if size changed and user hasn't manually touched shots
      if (!shotsTouchedByUser && configuringItem) {
        const group = configuringItem.itemOptionGroups?.find((ig) => ig.group.id === groupId);
        if (group && group.group.name.toLowerCase().includes("size")) {
          // Size changed, update shots based on new size
          const sizeOption = group.group.options.find((o) => o.id === optionId);
          const sizeName = sizeOption?.name.toLowerCase() || "";
          
          let newShots = 0;
          if (sizeName.includes("12") || sizeName.includes("12oz")) {
            newShots = configuringItem.defaultShots12oz ?? 0;
          } else if (sizeName.includes("16") || sizeName.includes("16oz")) {
            newShots = configuringItem.defaultShots16oz ?? 0;
          } else {
            // Fallback to 16oz default
            newShots = configuringItem.defaultShots16oz ?? configuringItem.defaultEspressoShots ?? 0;
          }
          
          setConfigShotsQty(newShots);
        }
      }
      
      return newSelection;
    });
  }

  /**
   * Calculate espresso shots upcharge based on pricing mode.
   * 
   * Business Rule: We always draw 2 shots at a time, so pricing is per 2-shot pair.
   * 
   * Mode 1: ESPRESSO_FREE2_PAIR40 (Americano, Latte)
   * - Shots 0-2: FREE (₱0)
   * - Shots 3-4: +₱40 (1 pair charged)
   * - Shots 5-6: +₱80 (2 pairs charged)
   * - Shots 7-8: +₱120 (3 pairs charged)
   * Formula: ceil(max(0, shotsQty - 2) / 2) * 4000 cents
   * 
   * Mode 2: PAIR40_NO_FREE (Matcha, other drinks)
   * - All shots charged at ₱40 per 2-shot pair
   * - 1 shot = ₱40 (1 pair)
   * - 2 shots = ₱40 (1 pair)
   * - 3 shots = ₱80 (2 pairs)
   * - 4 shots = ₱80 (2 pairs)
   * Formula: ceil(shotsQty / 2) * 4000 cents
   */
  function calculateShotsUpcharge(shotsQty: number, pricingMode: ShotsPricingMode | null | undefined): number {
    if (shotsQty === 0 || !pricingMode) return 0;
    
    if (pricingMode === "ESPRESSO_FREE2_PAIR40") {
      // First 2 shots are FREE
      const extraShots = Math.max(0, shotsQty - 2);
      if (extraShots === 0) return 0;
      
      // Charge ₱40 per 2 shots beyond the first 2
      const chargedPairs = Math.ceil(extraShots / 2);
      return chargedPairs * 4000; // 4000 cents = ₱40
    } else if (pricingMode === "PAIR40_NO_FREE") {
      // All shots charged at ₱40 per 2-shot pair
      const pairs = Math.ceil(shotsQty / 2);
      return pairs * 4000; // 4000 cents = ₱40 per pair
    }
    
    return 0;
  }

  function addToCart() {
    if (!configuringItem) return;

    const opts: CartItem["selectedOptions"] = [];
    let optionTotalCents = 0;

    configuringItem.itemOptionGroups.forEach(({ group }) => {
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
          optionTotalCents += opt.priceDelta;
        }
      });
    });

    // Add milk price delta (₱10 for non-default milk)
    const itemDefaultMilk = configuringItem.defaultMilk || "FULL_CREAM";
    const milkPriceDelta = configMilk !== itemDefaultMilk ? 1000 : 0; // 1000 cents = ₱10
    optionTotalCents += milkPriceDelta;

    // Calculate espresso shots upcharge using business rules
    const shotsUpchargeCents = calculateShotsUpcharge(configShotsQty, configuringItem.shotsPricingMode);
    optionTotalCents += shotsUpchargeCents;

    // Calculate per-line surcharge (use item-specific surcharge, fallback to 2000)
    const surchargeCents = configFulfillment === "FOODPANDA" 
      ? (configuringItem.foodpandaSurchargeCents ?? 2000) 
      : 0;

    // Determine default shots for the selected size
    const selectedSize = opts.find(o => 
      o.groupName.toUpperCase().includes("SIZE") || 
      o.name.toUpperCase().includes("OZ")
    );
    const is12oz = selectedSize?.name.includes("12");
    const defaultShotsForSize = is12oz 
      ? (configuringItem.defaultShots12oz ?? 0)
      : (configuringItem.defaultShots16oz ?? 0);

    const newItem: CartItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      itemId: configuringItem.id,
      itemName: configuringItem.name,
      basePrice: configuringItem.basePrice,
      qty: configQty,
      selectedOptions: opts,
      milkChoice: configMilk,
      defaultMilk: configuringItem.defaultMilk,
      shotsQty: configShotsQty,
      defaultShotsForSize,
      shotsUpchargeCents, // Snapshot the calculated upcharge
      fulfillment: configFulfillment,
      optionTotalCents,
      surchargeCents,
      discountPct: 0,
      discountAmount: 0,
      discountTag: null,
      note: configNote.trim() || undefined,
    };

    setCart((prev) => [...prev, newItem]);
    closeItemConfig();
  }

  function updateCartItem(updatedItem: CartItem) {
    setCart((prev) => prev.map((item) => (item.tempId === updatedItem.tempId ? updatedItem : item)));
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
    // Base price + all option deltas (including milk, shots, etc.)
    const unitPrice = item.basePrice + (item.optionTotalCents || 0);
    const subtotal = unitPrice * item.qty;
    const discount = item.discountAmount || 0;
    const surchargeCents = item.surchargeCents || 0;
    return Math.max(0, subtotal - discount + (surchargeCents * item.qty));
  }

  function calculateSubtotal() {
    return cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  }

  function calculateSurcharge() {
    // Service fee is now determined by payment method (FOODPANDA button), not transaction type
    return 0;
  }

  function calculateTotal() {
    const subtotal = calculateSubtotal(); // Already includes line-level discounts
    const surcharge = calculateSurcharge();
    return Math.max(0, subtotal + surcharge);
  }

  async function handleCheckout() {
    // Guard: Require staff for payment
    if (!activeStaff) {
      setShowStaffModal(true);
      return;
    }

    if (cart.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      // Use centralized builder to prevent money bugs
      const items = buildTxLineInputs(cart);

      const data = await fetchJson("/api/pos/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          discountCents: 0,
          ...(qrOrderId && { orderId: qrOrderId }) // Link to QR order if present
        }),
      });

      setCurrentTransaction(data);

      // Auto-add payment if amount received is provided
      if (amountReceivedPesos) {
        await addPayment(data.id);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(transactionId?: string) {
    // Guard: Require staff for payment
    if (!activeStaff) {
      setShowStaffModal(true);
      return;
    }

    const targetTransactionId = transactionId || currentTransaction?.id;
    if (!targetTransactionId) return;

    setBusy(true);
    setError(null);

    try {
      const amountCents = Math.round((parseFloat(amountReceivedPesos) || 0) * 100);
      const totalCents = calculateTotal();
      
      // Cash payment validation: Only block if amount entered and insufficient
      if (paymentMethod === "CASH" && amountCents > 0 && amountCents < totalCents) {
        setError("Insufficient cash received");
        setBusy(false);
        return;
      }
      
      // For cash with no amount entered, use total as amount
      const finalAmountCents = amountCents > 0 ? amountCents : totalCents;

      await fetchJson(`/api/pos/transactions/${targetTransactionId}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: paymentMethod, amountCents: finalAmountCents }),
      });

      // Reload transaction
      const updatedTransaction = await fetchJson(`/api/pos/transactions/${targetTransactionId}/receipt`, { cache: "no-store" });
      setCurrentTransaction(updatedTransaction);
      
      // Check if transaction is fully paid, switch to SUCCESS mode
      if (updatedTransaction.status === "PAID") {
        // Capture cart snapshot before clearing
        const cartSnapshot = [...cart];
        
        // Set completed transaction data
        setLastCompletedTransaction({
          id: updatedTransaction.id,
          transactionNo: updatedTransaction.transactionNo,
          totalCents: updatedTransaction.totalCents,
          method: paymentMethod,
          items: cartSnapshot,
          createdAt: new Date().toISOString(),
          staffName: activeStaff?.name,
        });
        
        // Clear working state
        setCart([]);
        setAmountReceivedPesos("");
        setCurrentTransaction(null);
        setPaymentMethod("CASH");
        
        // Switch to SUCCESS mode
        setCartPanelMode("SUCCESS");
      } else {
        // Partial payment - clear amount input but keep cart
        setAmountReceivedPesos("");
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      // DO NOT clear cart on error - stay in CART mode
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

  function getChange() {
    const received = Math.round((parseFloat(amountReceivedPesos) || 0) * 100);
    const total = calculateTotal();
    return received - total; // Can be negative
  }

  function isCashPaymentBlocked() {
    // Only block CASH payment if amount entered and insufficient
    if (paymentMethod !== "CASH") return false;
    
    const amountCents = Math.round((parseFloat(amountReceivedPesos) || 0) * 100);
    const totalCents = calculateTotal();
    
    // Block only if amount entered (> 0) and insufficient
    return amountCents > 0 && amountCents < totalCents;
  }

  function getCashValidationMessage() {
    if (!isCashPaymentBlocked()) return null;
    return "Insufficient cash received";
  }

  function addDenomination(amount: number) {
    const current = parseFloat(amountReceivedPesos) || 0;
    const newAmount = current + amount;
    setAmountReceivedPesos(newAmount.toFixed(2));
  }

  // Get payment button configuration from store config
  function getPaymentButtonConfig() {
    if (!storeConfig) {
      // Default config while loading
      return {
        methods: ["CASH", "CARD", "GCASH_MANUAL", "FOODPANDA"] as PaymentMode[],
        showSplit: true,
      };
    }

    const methods = storeConfig.paymentMethodOrder || storeConfig.enabledPaymentMethods;
    return {
      methods: methods.filter((m) => storeConfig.enabledPaymentMethods.includes(m)),
      showSplit: storeConfig.splitPaymentEnabled,
    };
  }

  // Get button color for payment method
  function getPaymentButtonColor(method: PaymentMode): string {
    const colors: Record<PaymentMode, string> = {
      CASH: "#10b981", // Green
      CARD: "#f97316", // Orange
      GCASH: "#3b82f6", // Blue
      FOODPANDA: "#ec4899", // Pink
      GRABFOOD: "#00b14f", // Grab green
      BFCAPP: "#8b5cf6", // Purple
    };
    return colors[method] || "#6b7280"; // Default gray
  }

  // Get button label for payment method
  function getPaymentButtonLabel(method: PaymentMode): string {
    const labels: Record<PaymentMode, string> = {
      CASH: "Cash",
      CARD: "Card",
      GCASH: "GCash",
      FOODPANDA: "Foodpanda",
      GRABFOOD: "GrabFood",
      BFCAPP: "BFC App",
    };
    return labels[method] || method;
  }

  async function handleSplitPayment(payments: Array<{ method: "CASH" | "CARD" | "GCASH"; amountCents: number }>, isRetry = false) {
    console.log("[SplitPayment] Starting", {
      hasActiveStaff: !!activeStaff,
      hasStaffKey: !!activeStaff?.staffKey,
      staffKeyPreview: activeStaff?.staffKey?.slice(0, 15),
      isRetry,
    });

    try {
      // Ensure staff is authenticated with valid key
      const hasValidStaff = await requireStaffForPayment();
      if (!hasValidStaff) {
        console.warn("[SplitPayment] Staff authentication required - aborting");
        setShowSplitPaymentModal(false);
        return;
      }

      setBusy(true);
      setError(null);

      console.log("[SplitPayment] Starting charge with", payments.length, "payments");

      // Build headers - only include x-staff-key if valid
      const buildHeaders = () => {
        console.log("[SplitPayment] Building headers - activeStaff state:", {
          hasActiveStaff: !!activeStaff,
          hasStaffKey: !!activeStaff?.staffKey,
          staffKeyPreview: activeStaff?.staffKey?.slice(0, 10),
        });
        
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (activeStaff?.staffKey?.trim()) {
          headers["x-staff-key"] = activeStaff.staffKey.trim();
          console.log("[SplitPayment] Added x-staff-key header:", activeStaff.staffKey.slice(0, 10) + "...");
        } else {
          console.warn("[SplitPayment] NO staffKey to add to headers!");
        }
        return headers;
      };

      // Create sale first if it doesn't exist
      let transactionId = currentTransaction?.id;
      if (!transactionId) {
        console.log("[SplitPayment] Creating sale first");
        // Use centralized builder to prevent money bugs
        const items = buildTxLineInputs(cart);

        const data = await fetchJson("/api/pos/transactions", {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({ 
            items, 
            discountCents: 0,
            ...(qrOrderId && { orderId: qrOrderId }) // Link to QR order if present
          }),
        });

        transactionId = data.id;
        setCurrentTransaction(data);
        console.log("[SplitPayment] Transaction created:", transactionId);
      }

      // Post each payment to the API
      for (const payment of payments) {
        console.log("[SplitPayment] Adding payment:", payment.method, payment.amountCents);
        await fetchJson(`/api/pos/transactions/${transactionId}/payments`, {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({ method: payment.method, amountCents: payment.amountCents }),
        });
      }

      // Reload sale to get updated payments
      console.log("[SplitPayment] Reloading sale");
      const updatedTransaction = await fetchJson(`/api/pos/transactions/${transactionId}/receipt`, { 
        cache: "no-store",
        headers: buildHeaders(),
      });
      setCurrentTransaction(updatedTransaction);
      setShowSplitPaymentModal(false);
      console.log("[SplitPayment] Complete");
      
      // Switch to SUCCESS mode if fully paid (same as normal payment flow)
      if (updatedTransaction.status === "PAID") {
        // Capture cart snapshot before clearing
        const cartSnapshot = [...cart];
        
        // Set completed transaction data
        setLastCompletedTransaction({
          id: updatedTransaction.id,
          transactionNo: updatedTransaction.transactionNo,
          totalCents: updatedTransaction.totalCents,
          method: "SPLIT", // Indicate split payment
          items: cartSnapshot,
          createdAt: new Date().toISOString(),
          staffName: activeStaff?.name,
        });
        
        // Clear working state
        setCart([]);
        setAmountReceivedPesos("");
        setCurrentTransaction(null);
        setPaymentMethod("CASH");
        
        // Switch to SUCCESS mode (stay on Register page)
        console.log("[SplitPayment] Setting cartPanelMode to SUCCESS");
        setCartPanelMode("SUCCESS");
      }
    } catch (e: any) {
      console.error("[SplitPayment] Error:", e);

      // Handle invalid staff key with recovery
      if (e?.message?.includes("Invalid staff key") && !isRetry) {
        console.warn("[SplitPayment] Invalid staff key detected - clearing session and requesting re-authentication");
        
        // Clear invalid staff session
        localStorage.removeItem("bfc_active_staff");
        setActiveStaff(null);
        setBusy(false);
        setShowSplitPaymentModal(false);
        
        // Prompt for staff login
        setShowStaffModal(true);
        setError("Staff session expired. Please log in again and retry.");
        return;
      }

      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function finalizePayment(method: PaymentMode, isRetry = false) {
    console.log("[PAY] START", { method, cartLength: cart.length, activeStaff, isRetry });

    try {
      // Pre-flight validation
      if (!cart.length) {
        console.log("[PAY] EMPTY CART");
        setError("Cart is empty");
        return;
      }

      // Ensure staff is authenticated with valid key
      const hasValidStaff = await requireStaffForPayment();
      if (!hasValidStaff) {
        console.warn("[PAY] Staff authentication required - aborting");
        return;
      }

      setBusy(true);
      const cartSnapshot = JSON.parse(JSON.stringify(cart));

      console.log("[PAY] Creating transaction...", { itemCount: cartSnapshot.length });

      // Use centralized builder to prevent money bugs
      const items = buildTxLineInputs(cartSnapshot);

      const txBody = {
        items,
        discountCents: 0,
      };

      console.log("[PAY] TX BODY", { 
        itemCount: items.length,
        discountCents: txBody.discountCents,
        firstItem: items[0]
      });

      // Build headers - only include x-staff-key if valid
      console.log("[PAY] Building transaction headers - activeStaff state:", {
        hasActiveStaff: !!activeStaff,
        hasStaffKey: !!activeStaff?.staffKey,
        staffKeyPreview: activeStaff?.staffKey?.slice(0, 10),
      });
      
      const txHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (activeStaff?.staffKey?.trim()) {
        txHeaders["x-staff-key"] = activeStaff.staffKey.trim();
        console.log("[PAY] Added x-staff-key header:", activeStaff.staffKey.slice(0, 10) + "...");
      } else {
        console.warn("[PAY] NO staffKey to add to headers!");
      }

      const { res: txRes, data: txData } = await apiFetch("/api/pos/transactions", {
        method: "POST",
        headers: txHeaders,
        body: JSON.stringify(txBody),
      });

      if (!txRes.ok) {
        setError(`Transaction failed (${txRes.status})`);
        setBusy(false);
        return;
      }

      console.log("[PAY] TX SUCCESS", { id: txData.id, totalCents: txData.totalCents });

      const transactionId = txData.id;
      const totalCents = txData.totalCents;

      console.log("[PAY] Recording payment...", { 
        transactionId, 
        totalCents, 
        method,
      });

      const paymentBody = {
        method,
        amountCents: totalCents,
      };

      console.log("[PAY] PAYMENT BODY", paymentBody);

      // Build payment headers - only include x-staff-key if valid
      const payHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (activeStaff?.staffKey?.trim()) {
        payHeaders["x-staff-key"] = activeStaff.staffKey.trim();
      }

      const { res: payRes, data: payData } = await apiFetch(`/api/pos/transactions/${transactionId}/payments`, {
        method: "POST",
        headers: payHeaders,
        body: JSON.stringify(paymentBody),
      });

      if (!payRes.ok) {
        setError(`Payment failed (${payRes.status})`);
        setBusy(false);
        return;
      }

      console.log("[PAY] PAYMENT SUCCESS");

      console.log("[PAY] SUCCESS — switching state");

      // Set completed transaction data
      setLastCompletedTransaction({
        id: txData.id,
        transactionNo: txData.transactionNo,
        totalCents: txData.totalCents,
        method: method,
        items: cartSnapshot,
        createdAt: new Date().toISOString(),
        staffName: activeStaff?.name,
      });

      // Clear working state
      setCart([]);
      setAmountReceivedPesos("");
      setCurrentTransaction(null);
      setPaymentMethod("CASH");
      setBusy(false);

      // Switch to SUCCESS mode
      console.log("[PAY] Setting cartPanelMode to SUCCESS");
      setCartPanelMode("SUCCESS");

      console.log("[PAY] State updated, should show success panel");

    } catch (err: any) {
      console.error("[PAY] CRASH", err);

      // Handle invalid staff key with one retry
      if (err?.name === "InvalidStaffKeyError" && !isRetry) {
        console.warn("[PAY] Invalid staff key detected - clearing session and requesting re-authentication");
        
        // Clear invalid staff session
        localStorage.removeItem("bfc_active_staff");
        setActiveStaff(null);
        setBusy(false);
        
        // Prompt for staff login
        setShowStaffModal(true);
        
        // Wait for staff to log in, then retry once
        // Note: The modal will close and set activeStaff when login succeeds
        // We'll retry on next user action rather than auto-retry
        setError("Staff session expired. Please log in again and retry.");
        return;
      }

      setError("Payment error: " + (err?.message || String(err)));
      setBusy(false);
    }
  }

  async function handlePaymentModeClick(mode: PaymentMode) {
    if (cart.length === 0) return;

    setSelectedPaymentMode(mode);

    // Set payment method for single payment
    if (mode === "CASH") setPaymentMethod("CASH");
    else if (mode === "CARD") setPaymentMethod("CARD");
    else if (mode === "GCASH") setPaymentMethod("GCASH");
    else if (mode === "FOODPANDA") setPaymentMethod("CASH"); // Foodpanda uses cash as payment method
    else if (mode === "GRABFOOD") setPaymentMethod("CASH"); // GrabFood uses cash as payment method
    else if (mode === "BFCAPP") setPaymentMethod("CASH"); // BFC App uses cash as payment method

    // Use new finalizePayment function
    await finalizePayment(mode);
  }

  function startNewTransaction() {
    setCurrentTransaction(null);
    setCart([]);
    setAmountReceivedPesos("");
    setPaymentMethod("CASH");
    setError(null);
    setQrOrderId(null); // Clear QR order link
    setLastCompletedTransaction(null);
    setCartPanelMode("CART");
  }

  function formatPesos(cents: number) {
    return `₱${(cents / 100).toFixed(2)}`;
  }

  // Get unique subcategories (series) from items
  function getSubcategories(items: Item[]): string[] {
    const subcategories = new Set<string>();
    items.forEach((item) => {
      subcategories.add(item.series || "Other");
    });
    return Array.from(subcategories).sort();
  }

  // Group items by series
  function groupItemsBySeries(items: Item[]) {
    const grouped: Record<string, Item[]> = {};
    items.forEach((item) => {
      const series = item.series || "Other";
      if (!grouped[series]) grouped[series] = [];
      grouped[series].push(item);
    });
    return grouped;
  }

  // Handle category change and reset to tiles view
  function handleCategoryChange(categoryId: string) {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setViewMode("tiles"); // Show subcategory tiles
  }

  // Handle subcategory tile click
  function handleSubcategoryClick(subcategory: string) {
    setSelectedSubcategory(subcategory);
    setViewMode("items"); // Show items grid
  }

  // Handle back to tiles
  function handleBackToTiles() {
    setSelectedSubcategory(null);
    setViewMode("tiles");
  }

  if (loading) {
    return (
      <div style={{ padding: 24, background: "#1a1a1a", minHeight: "100vh" }}>
        <h2 style={{ color: COLORS.primary }}>Loading menu...</h2>
        <p style={{ color: "#aaa" }}>Please wait while we fetch the menu items.</p>
      </div>
    );
  }

  if (error && menu.length === 0) {
    return (
      <div style={{ padding: 24, background: "#1a1a1a", minHeight: "100vh" }}>
        <div style={{ padding: 16, background: "#2a1a1a", border: "2px solid #ef4444", borderRadius: 8, marginBottom: 16 }}>
          <h2 style={{ color: "#ef4444", marginTop: 0 }}>⚠ Error Loading Menu</h2>
          <p style={{ color: "#ddd", fontSize: 14 }}>{error}</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            loadMenu();
          }}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (menu.length === 0) {
    return (
      <div style={{ padding: 24, background: "#1a1a1a", minHeight: "100vh" }}>
        <div style={{ padding: 16, background: "#2a2410", border: "2px solid #f59e0b", borderRadius: 8, marginBottom: 16 }}>
          <h2 style={{ color: "#fbbf24", marginTop: 0 }}>📋 No Menu Items Found</h2>
          <p style={{ color: "#ddd", fontSize: 14 }}>
            The menu is empty. Please run the seed script or add items in Prisma Studio.
          </p>
          <pre style={{ background: "#2a2a2a", color: "#ddd", padding: 12, borderRadius: 4, fontSize: 13, overflow: "auto" }}>
            cd apps/api{"\n"}
            npx prisma db seed
          </pre>
        </div>
        <button
          onClick={loadMenu}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Refresh Menu
        </button>
      </div>
    );
  }

  const currentCategory = Array.isArray(menu) ? menu.find((c) => c.id === selectedCategory) : undefined;
  const allCategoryItems = currentCategory?.items || [];
  const subcategories = allCategoryItems.length > 0 ? getSubcategories(allCategoryItems) : [];
  
  // Filter items by selected subcategory (for items view)
  const filteredItems = selectedSubcategory
    ? allCategoryItems.filter((item) => (item.series || "Other") === selectedSubcategory)
    : [];
  
  const groupedItems = filteredItems.length > 0 ? groupItemsBySeries(filteredItems) : {};

  // Tile colors for subcategories (cycling through colors)
  const tileColors = [
    { border: COLORS.primary, accent: COLORS.primary }, // gold (primary)
    { border: "#10b981", accent: "#10b981" }, // green
    { border: "#f59e0b", accent: "#f59e0b" }, // amber
    { border: "#ef4444", accent: "#ef4444" }, // red
    { border: "#8b5cf6", accent: "#8b5cf6" }, // purple
    { border: "#ec4899", accent: "#ec4899" }, // pink
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#1f1f1f" }}>
      {/* LEFT: 80% - Browse or Customize */}
      <div style={{ flex: "0 0 80%", display: "flex", flexDirection: "column", borderRight: "2px solid #2a2a2a" }}>
        
        {registerView === "BROWSE" ? (
          <>
            {/* Category Tabs */}
            <div style={{ padding: 12, borderBottom: "1px solid #2a2a2a", background: "#0a0a0a" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.isArray(menu) && menu.length > 0 ? (
                  menu.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      style={{
                        padding: "10px 20px",
                        fontSize: 14,
                        fontWeight: selectedCategory === cat.id ? "bold" : "normal",
                        background: selectedCategory === cat.id ? COLORS.primary : "#2a2a2a",
                        color: "#fff",
                        border: selectedCategory === cat.id ? `2px solid ${COLORS.primary}` : "1px solid #3a3a3a",
                        borderRadius: 4,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.currentTarget.style.background = "#3a3a3a";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.currentTarget.style.background = "#2a2a2a";
                        }
                      }}
                    >
                      {cat.name}
                    </button>
                  ))
                ) : (
                  <p style={{ color: "#666", fontSize: 14, margin: 0 }}>No categories available</p>
                )}
              </div>
            </div>

            {/* Browse Content Area */}
            <div style={{ flex: 1, overflow: "auto", padding: 20, background: "#1f1f1f" }}>
          {viewMode === "tiles" && subcategories.length > 0 ? (
            /* Subcategory Tiles Grid (UTAK Style) */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 900 }}>
              {subcategories.map((subcategory, index) => {
                const colors = tileColors[index % tileColors.length];
                return (
                  <button
                    key={subcategory}
                    onClick={() => handleSubcategoryClick(subcategory)}
                    style={{
                      padding: "24px 16px",
                      background: "#2a2a2a",
                      border: `2px solid ${colors.border}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 120,
                      position: "relative",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#333";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#2a2a2a";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: "bold",
                        color: "#fff",
                        textAlign: "center",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        lineHeight: "1.3",
                        marginBottom: 12,
                      }}
                    >
                      {subcategory}
                    </div>
                    {/* Colored accent underline */}
                    <div
                      style={{
                        width: 40,
                        height: 3,
                        background: colors.accent,
                        borderRadius: 2,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : viewMode === "items" && selectedSubcategory ? (
            /* Items Grid View */
            <div>
              {/* Back Button */}
              <button
                onClick={handleBackToTiles}
                style={{
                  padding: "8px 16px",
                  marginBottom: 16,
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Back to Categories
              </button>

              {/* Items Grid */}
              {Object.keys(groupedItems).length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#666" }}>
                  <p style={{ fontSize: 18, marginBottom: 8 }}>📦 No items in this subcategory</p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([series, items]) => (
                  <div key={series} style={{ marginBottom: 24 }}>
                    <h3
                      style={{
                        marginBottom: 12,
                        color: "#ddd",
                        borderBottom: `2px solid ${COLORS.primary}`,
                        paddingBottom: 6,
                        fontSize: 15,
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {series}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openItemConfig(item.id)}
                          style={{
                            padding: 14,
                            border: "2px solid #3a3a3a",
                            borderRadius: 8,
                            textAlign: "center",
                            cursor: "pointer",
                            background: "#2a2a2a",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#333";
                            e.currentTarget.style.borderColor = COLORS.primary;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "#2a2a2a";
                            e.currentTarget.style.borderColor = "#3a3a3a";
                          }}
                        >
                          <div style={{ fontWeight: "bold", marginBottom: 6, fontSize: 14, color: "#fff" }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 13, color: "#4ade80", fontWeight: "600" }}>
                            {formatPesos(item.basePrice)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: "center", color: "#666" }}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>Select a category to view subcategories</p>
            </div>
          )}
        </div>
          </>
        ) : registerView === "CUSTOMIZE" && configuringItem ? (
          <>
            {/* Customize Panel Header */}
            <div style={{ padding: 16, borderBottom: `2px solid ${COLORS.primary}`, background: "#0a0a0a", display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={closeItemConfig}
                style={{
                  padding: "8px 16px",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: "600",
                }}
              >
                ← Back
              </button>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>{configuringItem.name}</h2>
                <p style={{ margin: 0, marginTop: 4, fontSize: 16, color: COLORS.primary, fontWeight: "600" }}>
                  Base: {formatPesos(configuringItem.basePrice)}
                </p>
              </div>
            </div>

            {/* Customize Content Area */}
            <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#1f1f1f" }}>
              
              {/* MAJOR OPTIONS AT TOP */}
              
              {/* Temperature & Size (if they exist) */}
              {configuringItem.itemOptionGroups
                .filter(({ group }) => 
                  group.name.toLowerCase().includes("temperature") || 
                  group.name.toLowerCase().includes("size")
                )
                .map(({ group }) => (
                  <div key={group.id} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, marginBottom: 12, color: "#fff", fontWeight: "700", textTransform: "uppercase" }}>
                      {group.name} {group.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {group.options.map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.type)}
                            style={{
                              padding: "14px 24px",
                              border: `3px solid ${isSelected ? COLORS.primary : "#444"}`,
                              borderRadius: 8,
                              cursor: "pointer",
                              background: isSelected ? COLORS.primary : "#2a2a2a",
                              color: "#fff",
                              fontWeight: "bold",
                              transition: "all 0.2s",
                              fontSize: 16,
                              minWidth: 120,
                            }}
                          >
                            {opt.name}
                            {opt.priceDelta !== 0 && (
                              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
                                +{formatPesos(opt.priceDelta)}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Divider */}
              <div style={{ height: 2, background: "#3a3a3a", marginBottom: 24 }} />

              {/* Quantity Section - Prominent placement */}
              <div style={{ 
                marginBottom: 32, 
                padding: 16, 
                background: "#2a2a2a", 
                borderRadius: 8,
                border: "2px solid #444"
              }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: 12, 
                  fontWeight: "700", 
                  color: COLORS.primary, 
                  fontSize: 20,
                  textTransform: "uppercase"
                }}>
                  Quantity
                </label>
                <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
                  <button
                    onClick={() => setConfigQty((q) => Math.max(1, q - 1))}
                    style={{
                      padding: "14px 24px",
                      fontSize: 24,
                      background: "#1a1a1a",
                      color: "#fff",
                      border: "2px solid #555",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: "bold",
                      minWidth: 60,
                    }}
                  >
                    −
                  </button>
                  <span style={{ 
                    fontSize: 32, 
                    fontWeight: "bold", 
                    minWidth: 80, 
                    textAlign: "center", 
                    color: COLORS.primary,
                    padding: "8px 16px",
                    background: "#1a1a1a",
                    borderRadius: 6,
                  }}>
                    {configQty}
                  </span>
                  <button
                    onClick={() => setConfigQty((q) => q + 1)}
                    style={{
                      padding: "14px 24px",
                      fontSize: 24,
                      background: "#1a1a1a",
                      color: "#fff",
                      border: "2px solid #555",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: "bold",
                      minWidth: 60,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ADD-ONS SECTIONS */}
              <h2 style={{ fontSize: 20, marginBottom: 20, color: COLORS.primary, fontWeight: "700", textTransform: "uppercase" }}>
                Add-Ons
              </h2>

              {/* Sauces Section */}
              {configuringItem.itemOptionGroups
                .filter(({ group }) => group.name.toLowerCase().includes("sauce"))
                .map(({ group }) => (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 10, color: "#ddd", fontWeight: "600" }}>
                      {group.name}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {group.options.map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.type)}
                            style={{
                              padding: "10px 16px",
                              border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? COLORS.primary : "#2a2a2a",
                              color: "#fff",
                              fontWeight: isSelected ? "bold" : "normal",
                              transition: "all 0.2s",
                              fontSize: 14,
                            }}
                          >
                            {opt.name}
                            {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Syrups Section */}
              {configuringItem.itemOptionGroups
                .filter(({ group }) => group.name.toLowerCase().includes("syrup"))
                .map(({ group }) => (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 10, color: "#ddd", fontWeight: "600" }}>
                      {group.name} {group.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {group.options.map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.type)}
                            style={{
                              padding: "10px 16px",
                              border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? COLORS.primary : "#2a2a2a",
                              color: "#fff",
                              fontWeight: isSelected ? "bold" : "normal",
                              transition: "all 0.2s",
                              fontSize: 14,
                            }}
                          >
                            {opt.name}
                            {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Foams Section */}
              {configuringItem.itemOptionGroups
                .filter(({ group }) => group.name.toLowerCase().includes("foam"))
                .map(({ group }) => (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 10, color: "#ddd", fontWeight: "600" }}>
                      {group.name}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {group.options.map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.type)}
                            style={{
                              padding: "10px 16px",
                              border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? COLORS.primary : "#2a2a2a",
                              color: "#fff",
                              fontWeight: isSelected ? "bold" : "normal",
                              transition: "all 0.2s",
                              fontSize: 14,
                            }}
                          >
                            {opt.name}
                            {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Shots Section - Always show if item supports shots */}
              {configuringItem.supportsShots && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 16, margin: 0, color: "#ddd", fontWeight: "600" }}>Espresso Shots</h3>
                    {configuringItem.shotsPricingMode === "ESPRESSO_FREE2_PAIR40" && (
                      <span style={{ fontSize: 12, color: "#4ade80", fontWeight: "600" }}>
                        First 2 FREE • +₱40 per 2 shots after
                      </span>
                    )}
                    {configuringItem.shotsPricingMode === "PAIR40_NO_FREE" && (
                      <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: "600" }}>
                        +₱40 per 2 shots
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      onClick={() => {
                        setShotsTouchedByUser(true); // Mark as manually touched
                        setConfigShotsQty((q) => Math.max(0, q - 1));
                      }}
                      style={{
                        padding: "10px 18px",
                        fontSize: 20,
                        background: "#2a2a2a",
                        color: "#fff",
                        border: "1px solid #444",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: 20, fontWeight: "bold", minWidth: 50, textAlign: "center", color: "#fff" }}>
                      {configShotsQty}
                    </span>
                    <button
                      onClick={() => {
                        setShotsTouchedByUser(true); // Mark as manually touched
                        setConfigShotsQty((q) => q + 1);
                      }}
                      style={{
                        padding: "10px 18px",
                        fontSize: 20,
                        background: "#2a2a2a",
                        color: "#fff",
                        border: "1px solid #444",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      +
                    </button>
                    <span style={{ color: "#aaa", fontSize: 14, marginLeft: 8 }}>
                      {(() => {
                        const upcharge = calculateShotsUpcharge(configShotsQty, configuringItem.shotsPricingMode);
                        if (configShotsQty === 0) return null;
                        if (upcharge === 0) return <span style={{ color: "#4ade80" }}>(FREE)</span>;
                        return `(+${formatPesos(upcharge)})`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Milk Substitute Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 10, color: "#ddd", fontWeight: "600" }}>
                  Milk Substitute
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(["FULL_CREAM", "OAT", "ALMOND", "SOY"] as MilkType[]).map((milk) => {
                    const isSelected = configMilk === milk;
                    const itemDefaultMilk = configuringItem.defaultMilk || "FULL_CREAM";
                    const priceDelta = milk !== itemDefaultMilk ? 1000 : 0;
                    const label = milk === "FULL_CREAM" ? "Full Cream" : milk === "OAT" ? "Oat Milk" : milk === "ALMOND" ? "Almond Milk" : "Soy Milk";
                    const isDefault = milk === itemDefaultMilk;
                    
                    return (
                      <button
                        key={milk}
                        onClick={() => setConfigMilk(milk)}
                        style={{
                          padding: "10px 16px",
                          border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          background: isSelected ? COLORS.primary : "#2a2a2a",
                          color: "#fff",
                          fontWeight: isSelected ? "bold" : "normal",
                          transition: "all 0.2s",
                          fontSize: 14,
                          position: "relative",
                        }}
                      >
                        {label}
                        {isDefault && <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>(default)</span>}
                        {priceDelta > 0 && ` (+${formatPesos(priceDelta)})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other Option Groups (not temperature/size/sauce/syrup/foam) */}
              {configuringItem.itemOptionGroups
                .filter(
                  ({ group }) =>
                    !group.name.toLowerCase().includes("temperature") &&
                    !group.name.toLowerCase().includes("size") &&
                    !group.name.toLowerCase().includes("syrup") &&
                    !group.name.toLowerCase().includes("sauce") &&
                    !group.name.toLowerCase().includes("foam")
                )
                .map(({ group }) => (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 10, color: "#ddd", fontWeight: "600" }}>
                      {group.name} {group.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {group.options.map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.type)}
                            style={{
                              padding: "10px 16px",
                              border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? COLORS.primary : "#2a2a2a",
                              color: "#fff",
                              fontWeight: isSelected ? "bold" : "normal",
                              transition: "all 0.2s",
                              fontSize: 14,
                            }}
                          >
                            {opt.name}
                            {opt.priceDelta !== 0 && ` (+${formatPesos(opt.priceDelta)})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Fulfillment Section */}
              <div style={{ marginBottom: 20, paddingTop: 16, borderTop: `2px solid ${COLORS.primary}` }}>
                <h3 style={{ fontSize: 17, marginBottom: 10, color: COLORS.primary, fontWeight: "700" }}>
                  Fulfillment <span style={{ color: "#ef4444", fontSize: 18 }}>*</span>
                  <span style={{ fontSize: 12, color: "#aaa", fontWeight: "normal", marginLeft: 8 }}>
                    (Required per item)
                  </span>
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["FOR_HERE", "TAKE_OUT", "FOODPANDA"] as const).map((fulfillment) => {
                    const isSelected = configFulfillment === fulfillment;
                    const label = fulfillment === "FOR_HERE" ? "For Here" : fulfillment === "TAKE_OUT" ? "Take Out" : "Foodpanda";
                    const surcharge = fulfillment === "FOODPANDA" ? (configuringItem.foodpandaSurchargeCents ?? 2000) : 0;
                    return (
                      <button
                        key={fulfillment}
                        onClick={() => setConfigFulfillment(fulfillment)}
                        style={{
                          flex: 1,
                          padding: "12px 16px",
                          border: `2px solid ${isSelected ? COLORS.primary : "#444"}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          background: isSelected ? COLORS.primary : "#2a2a2a",
                          color: "#fff",
                          fontWeight: isSelected ? "bold" : "normal",
                          transition: "all 0.2s",
                          fontSize: 14,
                        }}
                      >
                        {label}
                        {surcharge > 0 && ` (+${formatPesos(surcharge)})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Field */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 10, fontWeight: "600", color: "#ddd", fontSize: 16 }}>
                  Special Instructions
                </label>
                <textarea
                  value={configNote}
                  readOnly
                  onClick={() => {
                    keyboard.openKeyboard({
                      mode: "text",
                      value: configNote,
                      title: "Special Instructions",
                      onChange: setConfigNote,
                      onDone: setConfigNote,
                    });
                  }}
                  placeholder="Tap to enter instructions"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 14,
                    background: "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: 6,
                    minHeight: 80,
                    resize: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Live Price Breakdown */}
              {(() => {
                // Calculate live totals
                const optionsTotal = configuringItem.itemOptionGroups.reduce((sum, { group }) => {
                  const selected = selectedOptions[group.id] || [];
                  return sum + selected.reduce((optSum, optId) => {
                    const opt = group.options.find((o) => o.id === optId);
                    return optSum + (opt?.priceDelta || 0);
                  }, 0);
                }, 0);

                const itemDefaultMilk = configuringItem.defaultMilk || "FULL_CREAM";
                const milkDelta = configMilk !== itemDefaultMilk ? 1000 : 0;
                
                // Use espresso pricing formula
                const shotsDelta = calculateShotsUpcharge(configShotsQty, configuringItem.shotsPricingMode);
                
                const surcharge = configFulfillment === "FOODPANDA" ? (configuringItem.foodpandaSurchargeCents ?? 2000) : 0;
                
                const unitPrice = configuringItem.basePrice + optionsTotal + milkDelta + shotsDelta;
                const lineTotal = (unitPrice + surcharge) * configQty;

                return (
                  <div style={{ 
                    background: "#0a0a0a", 
                    padding: 16, 
                    borderRadius: 8, 
                    border: `2px solid ${COLORS.primary}`,
                    marginBottom: 20
                  }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.primary, fontWeight: "700" }}>
                      Price Breakdown
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                        <span>Base Price:</span>
                        <span style={{ color: "#fff" }}>{formatPesos(configuringItem.basePrice)}</span>
                      </div>
                      {optionsTotal > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                          <span>Options:</span>
                          <span style={{ color: "#fff" }}>+{formatPesos(optionsTotal)}</span>
                        </div>
                      )}
                      {milkDelta > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                          <span>Milk Upgrade ({configMilk === "OAT" ? "Oat" : configMilk === "ALMOND" ? "Almond" : "Soy"}):</span>
                          <span style={{ color: "#fff" }}>+{formatPesos(milkDelta)}</span>
                        </div>
                      )}
                      {configShotsQty > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                          <span>
                            Espresso Shots ({configShotsQty})
                            {configuringItem.shotsPricingMode === "ESPRESSO_FREE2_PAIR40" && configShotsQty <= 2 && (
                              <span style={{ color: "#4ade80", fontSize: 12, marginLeft: 4 }}>(FREE)</span>
                            )}
                            {configuringItem.shotsPricingMode === "ESPRESSO_FREE2_PAIR40" && configShotsQty > 2 && (
                              <span style={{ fontSize: 12, marginLeft: 4 }}>(2 free, {configShotsQty - 2} charged)</span>
                            )}
                            {configuringItem.shotsPricingMode === "PAIR40_NO_FREE" && (
                              <span style={{ fontSize: 12, marginLeft: 4 }}>({Math.ceil(configShotsQty / 2)} pair{Math.ceil(configShotsQty / 2) !== 1 ? 's' : ''})</span>
                            )}
                          </span>
                          <span style={{ color: shotsDelta > 0 ? "#fff" : "#4ade80" }}>
                            {shotsDelta > 0 ? `+${formatPesos(shotsDelta)}` : "FREE"}
                          </span>
                        </div>
                      )}
                      {surcharge > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                          <span>Foodpanda Surcharge:</span>
                          <span style={{ color: "#fff" }}>+{formatPesos(surcharge)}</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: "#3a3a3a", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#aaa" }}>
                        <span>Unit Price:</span>
                        <span style={{ color: "#fff", fontWeight: "600" }}>{formatPesos(unitPrice + surcharge)}</span>
                      </div>
                      {configQty > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#aaa" }}>
                          <span>Quantity:</span>
                          <span style={{ color: "#fff" }}>× {configQty}</span>
                        </div>
                      )}
                      <div style={{ height: 2, background: COLORS.primary, margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: "bold" }}>
                        <span style={{ color: COLORS.primary }}>Line Total:</span>
                        <span style={{ color: COLORS.primary }}>{formatPesos(lineTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Action Buttons - Fixed at Bottom */}
            <div style={{ padding: 16, borderTop: `2px solid ${COLORS.primary}`, background: "#0a0a0a", display: "flex", gap: 12 }}>
              <button
                onClick={addToCart}
                style={{
                  flex: 1,
                  padding: "16px 24px",
                  fontSize: 18,
                  fontWeight: "bold",
                  background: COLORS.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.primaryDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.primary)}
              >
                Add to Cart
              </button>
              <button
                onClick={closeItemConfig}
                style={{
                  padding: "16px 24px",
                  fontSize: 16,
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : registerView === "CUSTOMIZE" && !configuringItem ? (
          <>
            {/* Fallback: Customize mode but no item selected */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <div style={{ textAlign: "center", color: "#666" }}>
                <p style={{ fontSize: 18, marginBottom: 16 }}>No item selected</p>
                <button
                  onClick={() => setRegisterView("BROWSE")}
                  style={{
                    padding: "12px 24px",
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  ← Back to Browse
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* RIGHT: 20% - Cart & Checkout */}
      <div style={{ flex: "0 0 20%", display: "flex", flexDirection: "column", background: "#0a0a0a" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #2a2a2a", background: "#1f1f1f" }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Current Order</h2>
        </div>

        {/* Staff Selector (UTAK Style - Top of Cart) */}
        <div
          style={{
            padding: 12,
            borderBottom: "2px solid #2a2a2a",
            background: "#1a1a1a",
          }}
        >
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: activeStaff ? "#2a2a2a" : "#3a3a3a",
              border: activeStaff ? "1px solid #22c55e" : "1px solid #3a3a3a",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: activeStaff ? "#22c55e" : "#555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              👤
            </div>

            {/* Staff Name or Prompt */}
            <div style={{ flex: 1, textAlign: "left" }}>
              {activeStaff ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>{activeStaff.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{activeStaff.role}</div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: "#aaa" }}>Select Staff</div>
              )}
            </div>

            {/* Logout Icon (if logged in) */}
            {activeStaff && (
              <div
                style={{
                  fontSize: 11,
                  color: "#22c55e",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                Change
              </div>
            )}
          </button>
        </div>

        {error && (
          <div style={{ padding: 8, margin: 8, background: "#2a1a1a", border: "1px solid #ef4444", borderRadius: 4, fontSize: 12 }}>
            <span style={{ color: "#fca5a5" }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: 8,
                fontSize: 11,
                background: "none",
                border: "none",
                color: "#fca5a5",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Conditional Rendering: CART or SUCCESS */}
        {(() => {
          console.log("[CART PANEL RENDER]", { 
            cartPanelMode, 
            hasTransaction: !!lastCompletedTransaction,
            transactionId: lastCompletedTransaction?.id,
            transactionData: lastCompletedTransaction
          });
          
          if (cartPanelMode === "SUCCESS") {
            if (!lastCompletedTransaction) {
              console.error("[CART PANEL] SUCCESS mode but no transaction data");
              return (
                <div style={{ padding: 16, color: "#ef4444" }}>
                  <p>Error: No transaction data</p>
                  <button onClick={startNewTransaction} style={{ padding: 8, marginTop: 8 }}>
                    Reset
                  </button>
                </div>
              );
            }
            return (
              <TransactionSuccessPanel
                transaction={lastCompletedTransaction}
                onNewTransaction={startNewTransaction}
                formatPesos={formatPesos}
                router={router}
              />
            );
          }
          
          return (
            <>
              {/* Cart Items */}
              <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {cart.length === 0 ? (
            <p style={{ color: "#666", fontSize: 13, textAlign: "center", marginTop: 20 }}>Cart is empty</p>
          ) : (
            cart.map((item) => (
              <CartLineItem
                key={item.tempId}
                item={item}
                onRemove={() => removeFromCart(item.tempId)}
                onClick={() => setEditingCartItem(item)}
                formatPesos={formatPesos}
                calculateLineTotal={calculateLineTotal}
              />
            ))
          )}
        </div>

        {/* Totals */}
        <div style={{ padding: 12, borderTop: "1px solid #2a2a2a", background: "#1f1f1f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: "#aaa" }}>Subtotal:</span>
            <strong style={{ color: "#fff" }}>{formatPesos(calculateSubtotal())}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 20,
              fontWeight: "bold",
              paddingTop: 12,
              borderTop: "2px solid #3a3a3a",
              marginBottom: 16,
              color: "#4ade80",
            }}
          >
            <span>TOTAL:</span>
            <span>{formatPesos(calculateTotal())}</span>
          </div>

          {/* Enter Amount - UTAK Style */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: "bold", color: "#aaa", textTransform: "uppercase" }}>
              Enter Amount
            </label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                inputMode="none"
                readOnly
                value={amountReceivedPesos}
                onClick={() => {
                  keyboard.openKeyboard({
                    mode: "numeric",
                    value: amountReceivedPesos,
                    title: "Enter Amount (₱)",
                    allowDecimal: true,
                    onChange: setAmountReceivedPesos,
                    onDone: setAmountReceivedPesos,
                  });
                }}
                placeholder="Tap to enter"
                style={{
                  flex: 1,
                  padding: 10,
                  fontSize: 16,
                  textAlign: "right",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              />
              <button
                onClick={() => setAmountReceivedPesos("")}
                style={{
                  padding: 10,
                  background: "transparent",
                  color: "#ef4444",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          {/* Denomination Shortcuts - UTAK Colors */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
            <button
              onClick={() => addDenomination(20)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#DBA743",
                border: "2px solid #DBA743",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(219, 167, 67, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱20
            </button>
            <button
              onClick={() => addDenomination(50)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#D85D60",
                border: "2px solid #D85D60",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(216, 93, 96, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱50
            </button>
            <button
              onClick={() => addDenomination(100)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#526EBA",
                border: "2px solid #526EBA",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(82, 110, 186, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱100
            </button>
            <button
              onClick={() => addDenomination(200)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#19C318",
                border: "2px solid #19C318",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(25, 195, 24, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱200
            </button>
            <button
              onClick={() => addDenomination(500)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#DE8831",
                border: "2px solid #DE8831",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(222, 136, 49, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱500
            </button>
            <button
              onClick={() => addDenomination(1000)}
              style={{
                padding: "12px 8px",
                fontSize: 13,
                fontWeight: "bold",
                background: "transparent",
                color: "#4C8EC4",
                border: "2px solid #4C8EC4",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(76, 142, 196, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              +₱1000
            </button>
          </div>

          {/* Summary - UTAK Style */}
          <div
            style={{
              padding: 12,
              background: "#2a2a2a",
              borderRadius: 6,
              marginBottom: 16,
              border: "1px solid #3a3a3a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "#aaa" }}>Subtotal:</span>
              <strong style={{ color: "#fff" }}>{formatPesos(calculateSubtotal())}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "#aaa" }}>Total:</span>
              <strong style={{ color: "#4ade80", fontSize: 16 }}>{formatPesos(calculateTotal())}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #3a3a3a",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#aaa" }}>Cash Received:</span>
              <strong style={{ color: "#fff" }}>
                {amountReceivedPesos ? formatPesos(Math.round(parseFloat(amountReceivedPesos) * 100)) : "₱0.00"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#aaa" }}>Change:</span>
              <strong style={{ color: getChange() >= 0 ? "#4ade80" : "#ef4444" }}>
                {amountReceivedPesos
                  ? getChange() >= 0
                    ? formatPesos(getChange())
                    : `-${formatPesos(Math.abs(getChange()))}`
                  : "₱0.00"}
              </strong>
            </div>
          </div>

          {/* Cash Validation Warning */}
          {getCashValidationMessage() && (
            <div
              style={{
                padding: "8px 12px",
                background: "#7f1d1d",
                border: "1px solid #ef4444",
                borderRadius: 6,
                color: "#fca5a5",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              ⚠️ {getCashValidationMessage()}
            </div>
          )}

          {/* Payment Mode Buttons - Config-Driven (Single Row) */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* Split Payment Button (Icon Only - Small Square) - Conditional */}
            {getPaymentButtonConfig().showSplit && (
              <button
                type="button"
                onClick={() => {
                  try {
                    if (cart.length === 0 || busy) return;
                    
                    requireStaffForPaymentSync(() => {
                      console.log("[SplitPayment] Opening modal - no API call");
                      setShowSplitPaymentModal(true);
                    });
                  } catch (err) {
                    console.error("[SplitPayment] Click failed:", err);
                    setError("Failed to open split payment: " + (err instanceof Error ? err.message : String(err)));
                  }
                }}
                disabled={cart.length === 0 || busy}
                style={{
                  width: 50,
                  padding: "16px 12px",
                  fontSize: 12,
                  fontWeight: "bold",
                  background: cart.length === 0 || busy ? "#444" : "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: cart.length === 0 || busy ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  opacity: !activeStaff ? 0.6 : 1,
                }}
                title="Split Payment"
              >
                <SplitPaymentIcon />
              </button>
            )}

            {/* Dynamic Payment Method Buttons */}
            {getPaymentButtonConfig().methods.map((method) => {
              // Check if this specific button should be disabled
              const isMethodBlocked = method === "CASH" && isCashPaymentBlocked();
              const isCartEmpty = cart.length === 0;
              const isDisabled = isCartEmpty || busy || isMethodBlocked;

              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    if (isCartEmpty || busy || isMethodBlocked) return;
                    requireStaffForPaymentSync(() => handlePaymentModeClick(method));
                  }}
                  disabled={isDisabled}
                  style={{
                    flex: 1,
                    padding: "16px",
                    fontSize: 14,
                    fontWeight: "bold",
                    background: isDisabled ? "#444" : getPaymentButtonColor(method),
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: isDisabled ? "not-allowed" : (!activeStaff ? "pointer" : "pointer"),
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    opacity: !activeStaff ? 0.6 : (isMethodBlocked ? 0.5 : 1),
                  }}
                >
                  {busy && selectedPaymentMode === method ? "Processing..." : getPaymentButtonLabel(method)}
                </button>
              );
            })}
          </div>
        </div>
          </>
          );
        })()}
      </div>

      {/* Cart Item Editor Modal */}
      {editingCartItem && (
        <CartItemEditorModal
          item={editingCartItem}
          onSave={updateCartItem}
          onClose={() => setEditingCartItem(null)}
          onRemove={() => removeFromCart(editingCartItem.tempId)}
          formatPesos={formatPesos}
        />
      )}

      {/* Staff Selector Modal */}
      {showStaffModal && (
        <StaffSelectorModal
          staffList={staffList}
          activeStaff={activeStaff}
          onLogin={handleStaffLogin}
          onLogout={handleStaffLogout}
          onClose={() => setShowStaffModal(false)}
          busy={staffBusy}
        />
      )}

      {/* Split Payment Modal */}
      {showSplitPaymentModal && (
        <SplitPaymentModal
          totalCents={currentTransaction ? currentTransaction.totalCents - getTotalPaid() : calculateTotal()}
          onClose={() => {
            console.log("[SplitPayment] Modal closed");
            setShowSplitPaymentModal(false);
          }}
          onCharge={handleSplitPayment}
          formatPesos={formatPesos}
        />
      )}

      {/* Receipt Modal */}
      {currentTransaction && isFullyPaid() && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "#2a2a2a",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid #444",
            }}
          >
            <h2 style={{ color: "#10b981", marginBottom: 16 }}>✓ Transaction Complete!</h2>
            <div style={{ marginBottom: 16, color: "#ddd" }}>
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

            <h3 style={{ color: "#ddd" }}>Items:</h3>
            {currentTransaction.lineItems.map((line) => (
              <div
                key={line.id}
                style={{ padding: 10, marginBottom: 8, border: "1px solid #444", borderRadius: 4, background: "#1a1a1a" }}
              >
                <div>
                  <strong style={{ color: "#fff" }}>
                    {line.qty}× {line.name}
                  </strong>
                </div>
                {line.optionsJson && (
                  <div style={{ fontSize: 13, color: "#aaa" }}>
                    {JSON.parse(line.optionsJson).map((opt: any, i: number) => (
                      <div key={i}>• {opt.name}</div>
                    ))}
                  </div>
                )}
                <div style={{ textAlign: "right", color: "#4ade80", fontWeight: "600" }}>
                  {formatPesos(line.lineTotal)}
                </div>
              </div>
            ))}

            <h3 style={{ color: "#ddd", marginTop: 16 }}>Payments:</h3>
            {currentTransaction.payments.map((pmt) => (
              <div
                key={pmt.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 8,
                  background: "#1a1a1a",
                  marginBottom: 4,
                  borderRadius: 4,
                }}
              >
                <span style={{ color: "#aaa" }}>{pmt.method}</span>
                <strong style={{ color: "#fff" }}>{formatPesos(pmt.amountCents)}</strong>
              </div>
            ))}

            <button
              onClick={startNewTransaction}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginTop: 20,
                fontSize: 16,
                fontWeight: "bold",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              New Transaction
            </button>
          </div>
        </div>
      )}

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isOpen={keyboard.isOpen}
        mode={keyboard.mode}
        value={keyboard.value}
        title={keyboard.title}
        allowDecimal={keyboard.allowDecimal}
        onClose={keyboard.closeKeyboard}
        onValueChange={keyboard.updateValue}
        onDone={keyboard.handleDone}
      />
    </div>
  );
}

// TransactionSuccessPanel Component
function TransactionSuccessPanel({
  transaction,
  onNewTransaction,
  formatPesos,
  router,
}: {
  transaction: {
    id: string;
    transactionNo: number;
    totalCents: number;
    method: string;
    items: CartItem[];
    createdAt: string;
    staffName?: string;
  };
  onNewTransaction: () => void;
  formatPesos: (cents: number) => string;
  router: ReturnType<typeof useRouter>;
}) {
  console.log("[SUCCESS PANEL RENDER]", { transaction });

  // Guard: Ensure transaction exists
  if (!transaction) {
    console.error("[SUCCESS PANEL] No transaction data");
    return null;
  }

  // Guard: Ensure required fields exist
  if (!transaction.id || !transaction.items) {
    console.error("[SUCCESS PANEL] Missing required fields", transaction);
    return null;
  }

  const hasDrinks = transaction.items.some(item => 
    item?.itemName?.toLowerCase().includes("coffee") || 
    item?.itemName?.toLowerCase().includes("latte") ||
    item?.itemName?.toLowerCase().includes("matcha")
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflow: "auto" }}>
      {/* Success Icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            background: "#22c55e",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ color: "#22c55e", margin: 0, fontSize: 20 }}>Transaction Successful</h2>
      </div>

      {/* Transaction Details */}
      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#aaa", fontSize: 13 }}>Transaction #</span>
          <strong style={{ color: "#fff", fontSize: 13 }}>{transaction.transactionNo}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#aaa", fontSize: 13 }}>Total</span>
          <strong style={{ color: COLORS.primary, fontSize: 18 }}>{formatPesos(transaction.totalCents)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#aaa", fontSize: 13 }}>Payment Method</span>
          <span
            style={{
              padding: "4px 12px",
              background: "#22c55e",
              color: "#fff",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {transaction.method}
          </span>
        </div>
        {transaction.staffName && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#aaa", fontSize: 13 }}>Cashier</span>
            <strong style={{ color: "#fff", fontSize: 13 }}>{transaction.staffName}</strong>
          </div>
        )}
      </div>

      {/* Print Buttons - UTAK Style (ABOVE items) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => alert("Print Receipt - Not implemented yet")}
          style={{
            padding: "12px",
            fontSize: 13,
            fontWeight: "600",
            background: "#3a3a3a",
            color: "#fff",
            border: "1px solid #4a4a4a",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          🧾 Receipt
        </button>
        <button
          onClick={() => alert("Print Sticker - Not implemented yet")}
          style={{
            padding: "12px",
            fontSize: 13,
            fontWeight: "600",
            background: "#3a3a3a",
            color: "#fff",
            border: "1px solid #4a4a4a",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          🏷️ Sticker
        </button>
      </div>

      {/* Items List */}
      <div style={{ flex: 1, overflow: "auto", marginBottom: 16 }}>
        <h3 style={{ color: "#fff", fontSize: 14, marginBottom: 12, fontWeight: "600" }}>
          Receipt Details
        </h3>
        {(transaction.items || []).map((item, idx) => {
          if (!item) return null;
          
          // Use shared formatter
          const { primaryText, secondaryParts, fulfillmentLabel, fulfillmentColor } = formatLineItemModifiers(item);
          
          return (
            <div
              key={idx}
              style={{
                padding: 10,
                background: "#2a2a2a",
                borderRadius: 6,
                marginBottom: 8,
                border: "1px solid #3a3a3a",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                  {/* Item Name with Quantity and Fulfillment Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        background: COLORS.primary,
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 3,
                        minWidth: 20,
                        textAlign: "center",
                      }}
                    >
                      {item.qty || 1}×
                    </span>
                    <strong style={{ fontSize: 13, color: "#fff", lineHeight: "1.2" }}>
                      {item.itemName || "Unknown Item"}
                    </strong>
                    {/* Fulfillment Badge */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: "bold",
                        background: fulfillmentColor,
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {fulfillmentLabel}
                    </span>
                  </div>

                  {/* Modifiers - UTAK Style: Size+Temp bold, rest comma-separated */}
                  {(primaryText || secondaryParts.length > 0) && (
                    <div style={{ fontSize: 11, lineHeight: "1.4", marginLeft: 26 }}>
                      {primaryText && (
                        <span style={{ color: "#fff", fontWeight: "600" }}>{primaryText}</span>
                      )}
                      {primaryText && secondaryParts.length > 0 && (
                        <span style={{ color: "#888" }}>, </span>
                      )}
                      {secondaryParts.length > 0 && secondaryParts.map((part, i) => {
                        // Check if this part should be bold (marked with **)
                        const isBold = part.startsWith("**") && part.endsWith("**");
                        const text = isBold ? part.slice(2, -2) : part;
                        
                        return (
                          <span key={i}>
                            {i > 0 && <span style={{ color: "#888" }}>, </span>}
                            <span style={{ 
                              color: isBold ? "#fff" : "#888",
                              fontWeight: isBold ? "600" : "normal"
                            }}>
                              {text}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Note */}
                  {item.note && (
                    <div style={{ fontSize: 11, color: "#fbbf24", marginLeft: 26, marginTop: 4, fontStyle: "italic" }}>
                      Note: {item.note}
                    </div>
                  )}
                </div>

                {/* Price */}
                <strong style={{ fontSize: 14, color: "#4ade80", fontWeight: "600", flexShrink: 0 }}>
                  {formatPesos(((item.basePrice || 0) + (item.optionTotalCents || 0)) * (item.qty || 1))}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          onClick={onNewTransaction}
          style={{
            padding: "16px",
            fontSize: 16,
            fontWeight: "bold",
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          New Transaction
        </button>
        <button
          onClick={() => router.push("/pos/transactions")}
          style={{
            padding: "16px",
            fontSize: 16,
            fontWeight: "bold",
            background: "#3a3a3a",
            color: "#fff",
            border: "1px solid #4a4a4a",
            borderRadius: 6,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          View Transactions
        </button>
      </div>
    </div>
  );
}
