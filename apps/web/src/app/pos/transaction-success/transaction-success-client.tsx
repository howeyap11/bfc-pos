"use client";

import { useEffect, useState } from "react";
import { shouldPrintSticker, getStickerLineLabel } from "@/lib/sticker";
import { useRouter, useSearchParams } from "next/navigation";
import { COLORS } from "@/lib/theme";

type Transaction = {
  id: string;
  transactionNo: number;
  status: string;
  source: string;
  totalCents: number;
  createdAt: string;
  lineItems: Array<{
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    note: string | null;
    isDrink?: boolean | null;
    serveVessel?: string | null;
    optionsJson?: string | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    status: string;
  }>;
};

export default function TransactionSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transactionId");

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setError("No transaction ID provided");
      setLoading(false);
      return;
    }

    loadTransaction();
  }, [transactionId]);

  async function loadTransaction() {
    try {
      const res = await fetch(`/api/pos/transactions/${transactionId}/receipt`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load transaction");
        return;
      }

      setTransaction(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function handlePrint(type: "kitchen" | "order" | "sticker" | "receipt") {
    if (type === "sticker") {
      const stickerLines = (transaction?.lineItems ?? []).filter(shouldPrintSticker);
      if (stickerLines.length === 0) {
        setToastMessage("No sticker items in this order.");
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      console.log(`[Print] sticker for transaction ${transactionId}`, stickerLines.map((l) => getStickerLineLabel(l)));
      alert(`Print sticker (${stickerLines.length} item(s)):\n\n${stickerLines.map((l) => getStickerLineLabel(l)).join("\n\n")}`);
      return;
    }
    console.log(`[Print] ${type} for transaction ${transactionId}`);
    alert(`Print ${type} - Not implemented yet`);
  }

  function handleViewTransactions() {
    router.push("/pos/transactions");
  }

  function handleNewTransaction() {
    router.push("/pos/register");
  }

  function handleClose() {
    router.push("/pos/register");
  }

  function formatPesos(cents: number) {
    return `₱${(cents / 100).toFixed(2)}`;
  }

  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      CASH: "Cash",
      CARD: "Card",
      GCASH: "GCash",
      PAYMONGO: "PayMongo",
      FOODPANDA: "FoodPanda",
      GRABFOOD: "GrabFood",
      BFCAPP: "BFC App",
    };
    return labels[method] || method;
  }

  function getPaymentMethodColor(method: string): string {
    const colors: Record<string, string> = {
      CASH: "#22c55e",
      CARD: "#f97316",
      GCASH: "#3b82f6",
      PAYMONGO: "#8b5cf6",
      FOODPANDA: "#ec4899",
      GRABFOOD: "#10b981",
      BFCAPP: "#6366f1",
    };
    return colors[method] || "#6b7280";
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleDateString("en-US", options);
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", background: "#fff", minHeight: "100vh" }}>
        <p>Loading transaction...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div style={{ padding: 24, textAlign: "center", background: "#fff", minHeight: "100vh" }}>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{error || "Transaction not found"}</p>
        <button
          onClick={handleClose}
          style={{
            padding: "12px 24px",
            background: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          Back to Register
        </button>
      </div>
    );
  }

  // Get primary payment method for badge
  const primaryPayment = transaction.payments[0];
  const paymentMethod = primaryPayment?.method || "CASH";

  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f2937",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toastMessage}
        </div>
      )}
      {/* Header with Close Button */}
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>Transaction Success</h1>
        <button
          onClick={handleClose}
          style={{
            width: 32,
            height: 32,
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Success Confirmation */}
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        {/* Big Green Checkmark */}
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

        {/* Large Amount Total */}
        <div style={{ fontSize: 48, fontWeight: "bold", color: "#22c55e", marginBottom: 12 }}>
          {formatPesos(transaction.totalCents)}
        </div>

        {/* Payment Method Badge */}
        <div
          style={{
            display: "inline-block",
            padding: "6px 20px",
            background: getPaymentMethodColor(paymentMethod),
            color: "#fff",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 16,
          }}
        >
          {getPaymentMethodLabel(paymentMethod)}
        </div>

        {/* Date/Time + Staff Name */}
        <div
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#6b7280",
            fontSize: 14,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span>
            {formatDateTime(transaction.createdAt)} - Staff
          </span>
          <span style={{ transform: showDetails ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            ▲
          </span>
        </div>
      </div>

      {/* Action Panels */}
      <div style={{ padding: "0 24px 24px" }}>
        {/* Email Receipt Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email Address"
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <button
            onClick={() => alert("Email receipt - Not implemented yet")}
            style={{
              padding: "12px 24px",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📧</span>
            Email Receipt
          </button>
        </div>

        {/* Kitchen Note + Copies Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Kitchen Note"
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <input
            type="number"
            defaultValue="2"
            min="1"
            max="10"
            style={{
              width: 80,
              padding: "12px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              textAlign: "center",
            }}
          />
        </div>

        {/* Print Buttons Grid (2x2) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {/* Kitchen Button */}
          <button
            onClick={() => handlePrint("kitchen")}
            style={{
              padding: "20px",
              background: "#f97316",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "600",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>👨‍🍳</span>
            Kitchen
          </button>

          {/* Order Button */}
          <button
            onClick={() => handlePrint("order")}
            style={{
              padding: "20px",
              background: "#84cc16",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "600",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>🖨️</span>
            Order
          </button>

          {/* Sticker Button */}
          <button
            onClick={() => handlePrint("sticker")}
            style={{
              padding: "20px",
              background: "#06b6d4",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "600",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>🖨️</span>
            Sticker
          </button>

          {/* Receipt Button */}
          <button
            onClick={() => handlePrint("receipt")}
            style={{
              padding: "20px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "600",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>🖨️</span>
            Receipt
          </button>
        </div>
      </div>

      {/* Receipt Details Section */}
      <div style={{ padding: "0 24px 24px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Receipt Details
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {transaction.lineItems.length}
          </span>
        </div>

        {/* Line Items */}
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16 }}>
          {transaction.lineItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              {/* Checkmark Icon */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "#22c55e",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              {/* Item Details */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "500", fontSize: 14, marginBottom: 4 }}>
                  {item.name} x{item.qty}
                </div>
                {item.note && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {item.note}
                  </div>
                )}
              </div>

              {/* Price */}
              <div style={{ fontWeight: "600", fontSize: 14 }}>
                {formatPesos(item.lineTotal)}
              </div>
            </div>
          ))}

          {/* Total Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 16,
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            <span>Total</span>
            <span>{formatPesos(transaction.totalCents)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Buttons */}
      <div
        style={{
          padding: "16px 24px 32px",
          display: "flex",
          gap: 12,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <button
          onClick={handleViewTransactions}
          style={{
            flex: 1,
            padding: "16px",
            background: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          View Transactions
        </button>
        <button
          onClick={handleNewTransaction}
          style={{
            flex: 1,
            padding: "16px",
            background: "#fff",
            color: "#22c55e",
            border: "2px solid #22c55e",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          New Transaction
        </button>
      </div>
    </div>
  );
}

function formatPesos(cents: number) {
  return `₱${(cents / 100).toFixed(2)}`;
}
