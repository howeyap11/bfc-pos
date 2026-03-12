"use client";

import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";

type Transaction = {
  id: string;
  transactionNo: number;
  status: string;
  source: string;
  serviceType: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  serviceCents: number;
  createdAt: string;
  createdBy?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  table?: {
    label: string;
    zone: { code: string };
  } | null;
  lineItems: Array<{
    id: string;
    name: string;
    qty: number;
    lineTotal: number;
    optionsJson?: string | null;
    note?: string | null;
    item?: {
      category?: {
        id: string;
        name: string;
      } | null;
    } | null;
    refundItems: Array<{
      id: string;
      qtyRefunded: number;
      amountRefundedCents: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    status: string;
  }>;
  refunds: Array<{
    id: string;
    reason: string;
    createdAt: string;
    refundItems: Array<{
      id: string;
      transactionLineItemId: string;
      qtyRefunded: number;
      amountRefundedCents: number;
    }>;
  }>;
};

export default function TransactionsClient() {
  const keyboard = useOnScreenKeyboard();
  
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; role: string; staffKey: string } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Refund modal state
  const [refundingTransaction, setRefundingTransaction] = useState<Transaction | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [refundPin, setRefundPin] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState("");

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [ejournalCashierFilter, setEjournalCashierFilter] = useState<string>("ALL");

  useEffect(() => {
    // Load active staff from localStorage
    try {
      const stored = localStorage.getItem("bfc_active_staff");
      if (stored) {
        const staff = JSON.parse(stored);
        if (staff.staffKey) {
          setActiveStaff(staff);
        }
      }
    } catch (e) {
      console.error("[Transactions] Failed to load active staff", e);
    }
  }, []);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const res = await fetch("/api/staff/verify-admin-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        console.log("[Transactions] Admin verified:", data.name);
        setAuthenticated(true);
        setPinError("");
        loadTransactions();
      } else {
        setPinError(data.message || "Invalid admin PIN");
        setPinInput("");
      }
    } catch (e: any) {
      console.error("[Transactions] Admin verification failed:", e);
      setPinError("Verification failed: " + (e?.message || String(e)));
      setPinInput("");
    }
  }

  async function loadTransactions(append = false) {
    if (!activeStaff?.staffKey) {
      setError("No active staff session. Please login from the Register page first.");
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const cursor = append && nextCursor ? `&cursor=${nextCursor}` : "";
      const res = await fetch(`/api/pos/transactions/list?limit=30${cursor}`, { 
        cache: "no-store",
        headers: {
          "x-staff-key": activeStaff.staffKey,
        },
      });
      const data = await res.json();
      
      if (res.ok) {
        if (append) {
          setTransactions(prev => [...prev, ...(data.items || [])]);
        } else {
          setTransactions(data.items || []);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore ?? false);
      } else {
        setError(data.error || data.message || "Failed to load transactions");
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function getDateKey(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA");
  }

  function openRefundModal(transaction: Transaction) {
    // Only allow refund for PAID transactions
    if (transaction.status !== "PAID") {
      alert("Only PAID transactions can be refunded");
      return;
    }

    // Filter out already fully refunded lines
    const refundableLines = transaction.lineItems.filter(line => {
      const totalRefunded = line.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
      return totalRefunded < line.qty;
    });

    if (refundableLines.length === 0) {
      alert("All items in this transaction have already been refunded");
      return;
    }

    setRefundingTransaction(transaction);
    setSelectedLineIds([]);
    setRefundPin("");
    setRefundReason("");
    setRefundError("");
  }

  function toggleLineSelection(lineId: string) {
    setSelectedLineIds(prev => 
      prev.includes(lineId) 
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  }

  function selectAllRefundableLines() {
    if (!refundingTransaction) return;
    
    const refundableLineIds = refundingTransaction.lineItems
      .filter(line => {
        const totalRefunded = line.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
        return totalRefunded < line.qty;
      })
      .map(line => line.id);
    
    setSelectedLineIds(refundableLineIds);
  }

  async function handleRefundSubmit() {
    if (!refundingTransaction) return;
    
    if (!activeStaff?.staffKey) {
      setRefundError("No active staff session");
      return;
    }

    if (selectedLineIds.length === 0) {
      setRefundError("Please select at least one item to refund");
      return;
    }

    if (!refundPin) {
      setRefundError("Admin PIN is required");
      return;
    }

    if (!refundReason) {
      setRefundError("Reason is required");
      return;
    }

    setRefundBusy(true);
    setRefundError("");

    try {
      const res = await fetch(`/api/pos/transactions/${refundingTransaction.id}/refund`, {
        method: "POST",
        headers: { 
          "content-type": "application/json",
          "x-staff-key": activeStaff.staffKey,
        },
        body: JSON.stringify({
          adminPin: refundPin,
          reason: refundReason,
          lineIds: selectedLineIds,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setRefundError(data.error || data.message || "Failed to process refund");
        return;
      }

      // Update the transaction in the list
      setTransactions(prev => 
        prev.map(tx => tx.id === refundingTransaction.id ? data : tx)
      );

      // Close modal
      setRefundingTransaction(null);
      alert("Refund processed successfully");
    } catch (e: any) {
      setRefundError(e?.message ?? String(e));
    } finally {
      setRefundBusy(false);
    }
  }

  function formatPesos(cents: number) {
    return `₱${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function getPaymentMethodBadgeColor(method: string): string {
    switch (method) {
      case "CASH": return "#22c55e"; // green
      case "CARD": return "#f97316"; // orange
      case "GCASH": return "#3b82f6"; // blue
      case "PAYMONGO": return "#6366f1";
      case "FOODPANDA": return "#ec4899";
      case "GRABFOOD": return "#10b981";
      case "BFCAPP": return "#f59e0b";
      default: return "#6b7280"; // gray for unknown
    }
  }

  function calculateNetTotal(transaction: Transaction): number {
    const totalRefunded = transaction.lineItems.reduce((sum, line) => {
      const lineRefunded = line.refundItems.reduce((s, ri) => s + ri.amountRefundedCents, 0);
      return sum + lineRefunded;
    }, 0);
    
    return transaction.totalCents - totalRefunded;
  }

  function isLineRefunded(line: Transaction["lineItems"][0]): boolean {
    const totalRefunded = line.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
    return totalRefunded >= line.qty;
  }

  const dateGroups = useMemo(
    () =>
      transactions.length === 0
        ? []
        : (() => {
            const map = new Map<
              string,
              { dateKey: string; dateLabel: string; transactions: Transaction[] }
            >();
            for (const tx of transactions) {
              const key = getDateKey(tx.createdAt);
              const existing = map.get(key);
              if (existing) {
                existing.transactions.push(tx);
              } else {
                map.set(key, {
                  dateKey: key,
                  dateLabel: formatDate(tx.createdAt),
                  transactions: [tx],
                });
              }
            }
            const keys = Array.from(map.keys()).sort((a, b) =>
              a < b ? 1 : a > b ? -1 : 0
            );
            return keys.map((k) => map.get(k)!);
          })(),
    [transactions]
  );

  useEffect(() => {
    if (transactions.length === 0 || dateGroups.length === 0) {
      setSelectedDateKey(null);
      return;
    }

    const todayKey = getDateKey(new Date().toISOString());
    const hasToday = dateGroups.some((g) => g.dateKey === todayKey);

    setSelectedDateKey((prev) => {
      if (prev && dateGroups.some((g) => g.dateKey === prev)) {
        return prev;
      }
      if (hasToday) return todayKey;
      return dateGroups[0]?.dateKey ?? prev;
    });
  }, [transactions, dateGroups]);

  useEffect(() => {
    setEjournalCashierFilter("ALL");
  }, [selectedDateKey]);

  const report = useMemo(() => {
    if (!selectedDateKey) return null;
    const group = dateGroups.find((g) => g.dateKey === selectedDateKey);
    if (!group) return null;

    const txsForReport = group.transactions.filter((tx) => tx.status !== "VOID");
    if (txsForReport.length === 0) return null;

    const categoriesMap = new Map<
      string,
      { name: string; qty: number; amountCents: number }
    >();
    const cashierSet = new Set<string>();
    const ejournalRows: {
      id: string;
      label: string;
      categoryName: string | null;
      cashier: string;
      qty: number;
      amountCents: number;
    }[] = [];
    let totalQty = 0;
    let totalAmountCents = 0;

    for (const tx of txsForReport) {
      const cashier = tx.createdBy || "Unknown";
      cashierSet.add(cashier);
      const includeThisTxInFilter =
        ejournalCashierFilter === "ALL" || ejournalCashierFilter === cashier;

      for (const line of tx.lineItems) {
        const totalRefundedQty = line.refundItems.reduce(
          (sum, ri) => sum + ri.qtyRefunded,
          0
        );
        const totalRefundedAmount = line.refundItems.reduce(
          (sum, ri) => sum + ri.amountRefundedCents,
          0
        );
        const netQty = line.qty - totalRefundedQty;
        const netAmount = line.lineTotal - totalRefundedAmount;
        if (netQty <= 0 && netAmount <= 0) continue;

        const categoryName =
          line.item && line.item.category ? line.item.category.name : null;
        const catKey = categoryName || "Uncategorized";
        const existingCat = categoriesMap.get(catKey) || {
          name: catKey,
          qty: 0,
          amountCents: 0,
        };
        existingCat.qty += netQty;
        existingCat.amountCents += netAmount;
        categoriesMap.set(catKey, existingCat);

        if (includeThisTxInFilter) {
          ejournalRows.push({
            id: `${tx.id}-${line.id}`,
            label: line.name,
            categoryName,
            cashier,
            qty: netQty,
            amountCents: netAmount,
          });
          totalQty += netQty;
          totalAmountCents += netAmount;
        }
      }
    }

    const categories = Array.from(categoriesMap.values()).sort(
      (a, b) => b.amountCents - a.amountCents
    );
    const cashiers = Array.from(cashierSet.values()).sort();

    return {
      dateLabel:
        group.transactions.length > 0
          ? formatDate(group.transactions[0].createdAt)
          : "",
      categories,
      ejournal: {
        cashiers,
        rows: ejournalRows,
        totalQty,
        totalAmountCents,
      },
    };
  }, [selectedDateKey, dateGroups, ejournalCashierFilter]);

  function handlePrintCategorySummary() {
    if (!report) return;
    const lines =
      report.categories.length === 0
        ? ["No category sales for this date."]
        : report.categories.map(
            (c) =>
              `${c.name}: ${c.qty} item(s) — ${formatPesos(c.amountCents)}`
          );
    console.log("[Print] Category summary", {
      date: report.dateLabel,
      lines,
    });
    alert(
      `Print Category Summary\n${report.dateLabel}\n\n` + lines.join("\n")
    );
  }

  function handlePrintEjournal() {
    if (!report) return;
    const scopeLabel =
      ejournalCashierFilter === "ALL"
        ? "All cashiers"
        : `Cashier: ${ejournalCashierFilter}`;
    const lines =
      report.ejournal.rows.length === 0
        ? ["No sold items for this selection."]
        : report.ejournal.rows.map((row) => {
            const cat = row.categoryName ? ` [${row.categoryName}]` : "";
            return `${row.label}${cat} — ${row.qty} × ${formatPesos(
              Math.round(row.amountCents / Math.max(row.qty, 1))
            )} = ${formatPesos(row.amountCents)}`;
          });
    console.log("[Print] eJournal", {
      date: report.dateLabel,
      scope: scopeLabel,
      lines,
    });
    alert(
      `Print eJournal\n${report.dateLabel}\n${scopeLabel}\n\n` +
        lines.join("\n")
    );
  }

  if (!authenticated) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1f1f1f",
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            padding: 32,
            borderRadius: 12,
            border: "1px solid #3a3a3a",
            minWidth: 350,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center", color: "#fff" }}>
            Admin Access Required
          </h2>
          
          {!activeStaff?.staffKey && (
            <div style={{ 
              background: "#fef3c7", 
              color: "#92400e", 
              padding: 12, 
              borderRadius: 6, 
              marginBottom: 16, 
              fontSize: 14,
              textAlign: "center",
            }}>
              ⚠️ No active staff session. Please login from the Register page first.
            </div>
          )}
          
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              inputMode="none"
              readOnly
              value={pinInput}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "pin",
                  value: pinInput,
                  title: "Admin PIN",
                  onChange: setPinInput,
                  onDone: async (val) => {
                    setPinInput(val);
                    try {
                      const res = await fetch("/api/staff/verify-admin-pin", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ pin: val }),
                      });
                      const data = await res.json();
                      if (res.ok && data.ok) {
                        setAuthenticated(true);
                        setPinError("");
                        loadTransactions();
                        keyboard.closeKeyboard();
                      } else {
                        setPinError(data.message || "Invalid admin PIN");
                        setPinInput("");
                      }
                    } catch (e: any) {
                      setPinError("Verification failed: " + (e?.message || String(e)));
                      setPinInput("");
                    }
                  },
                });
              }}
              placeholder="Tap to enter PIN"
              style={{
                width: "100%",
                padding: 14,
                fontSize: 18,
                textAlign: "center",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                marginBottom: 16,
                background: "#1a1a1a",
                color: "#fff",
                cursor: "pointer",
              }}
            />
            {pinError && (
              <div style={{ color: "#ef4444", marginBottom: 16, fontSize: 14, textAlign: "center" }}>
                {pinError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 16,
                fontWeight: "bold",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Submit
            </button>
          </form>
        </div>

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

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#1f1f1f", height: "100vh" }}>
        <p>Loading transactions...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      background: "#1f1f1f", 
      color: "#fff" 
    }}>
      <div style={{ 
        flex: "0 0 auto",
        padding: 24,
        maxWidth: 1600,
        width: "100%",
        margin: "0 auto"
      }}>
        <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: "bold" }}>Transactions</h1>

        {error && (
          <div style={{ 
            padding: 12, 
            marginBottom: 16, 
            background: "#7f1d1d", 
            border: "1px solid #ef4444", 
            borderRadius: 6,
            color: "#fecaca"
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={() => setError(null)} 
              style={{ 
                marginLeft: 12, 
                fontSize: 12, 
                background: "transparent",
                border: "1px solid #fecaca",
                color: "#fecaca",
                padding: "4px 8px",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Transactions Table + Reporting Panel */}
      <div style={{ 
        flex: "1 1 auto",
        overflowY: "auto",
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 24
      }}>
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.3fr) minmax(320px, 1.7fr)",
            gap: 16,
          }}
        >
          <div style={{ overflowX: "auto", background: "#2a2a2a", borderRadius: 8, border: "1px solid #3a3a3a" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1a1a1a", borderBottom: "2px solid #3a3a3a" }}>
                <th style={{ padding: 16, textAlign: "left", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Date / ID / Payment
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Time
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Receipt #
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Cashier
                </th>
                <th style={{ padding: 16, textAlign: "left", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Items
                </th>
                <th style={{ padding: 16, textAlign: "right", fontWeight: "600", fontSize: 13, color: "#aaa", textTransform: "uppercase" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#666" }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                dateGroups.map((group) => (
                  <React.Fragment key={group.dateKey}>
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid #3a3a3a" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedDateKey(group.dateKey)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 16px",
                            background:
                              selectedDateKey === group.dateKey ? "#111827" : "#030712",
                            border: "none",
                            borderBottom: "1px solid #3a3a3a",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 14,
                            fontWeight: 600,
                            color:
                              selectedDateKey === group.dateKey ? "#f9fafb" : "#e5e7eb",
                          }}
                        >
                          <span>{group.dateLabel}</span>
                          <span
                            style={{
                              fontSize: 12,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background:
                                selectedDateKey === group.dateKey
                                  ? COLORS.primary
                                  : "#374151",
                              color: "#f9fafb",
                            }}
                          >
                            {group.transactions.length} tx
                          </span>
                        </button>
                      </td>
                    </tr>
                    {group.transactions.map((tx) => {
                      const netTotal = calculateNetTotal(tx);
                      const hasRefunds = tx.refunds.length > 0;
                      const isVoided = tx.status === "VOID";
                      
                      // Get unique payment methods
                      const paymentMethods = [...new Set(tx.payments.map(p => p.method))];
                      const isSplit = paymentMethods.length > 1;

                      return (
                        <tr 
                          key={tx.id} 
                          style={{ 
                            borderBottom: "1px solid #3a3a3a",
                            opacity: isVoided ? 0.5 : 1,
                          }}
                        >
                          {/* Date / ID / Payment */}
                          <td style={{ padding: 16, verticalAlign: "top" }}>
                            <div style={{ fontSize: 14, color: "#ddd", marginBottom: 4 }}>
                              {formatDate(tx.createdAt)}
                            </div>
                            <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace" }}>
                              {tx.id.slice(-8)}
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {isSplit ? (
                                <>
                                  <span style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: "600",
                                    background: "#6b7280",
                                    color: "#fff",
                                  }}>
                                    SPLIT
                                  </span>
                                  {paymentMethods.map(method => (
                                    <span
                                      key={method}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: "600",
                                        background: getPaymentMethodBadgeColor(method),
                                        color: "#fff",
                                      }}
                                    >
                                      {method}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span style={{
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: "600",
                                  background: getPaymentMethodBadgeColor(paymentMethods[0] || "CASH"),
                                  color: "#fff",
                                }}>
                                  {paymentMethods[0] || "CASH"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Time */}
                          <td style={{ padding: 16, verticalAlign: "top", fontSize: 14, color: "#ddd" }}>
                            {formatTime(tx.createdAt)}
                          </td>

                          {/* Receipt # */}
                          <td style={{ padding: 16, verticalAlign: "top", fontSize: 14, color: "#ddd", fontWeight: "600" }}>
                            #{tx.transactionNo}
                          </td>

                          {/* Cashier */}
                          <td style={{ padding: 16, verticalAlign: "top", fontSize: 14, color: "#ddd" }}>
                            {tx.createdBy || "—"}
                          </td>

                          {/* Items */}
                          <td style={{ padding: 16, verticalAlign: "top" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {tx.lineItems.map(line => {
                                const refunded = isLineRefunded(line);
                                const options = line.optionsJson ? JSON.parse(line.optionsJson) : [];
                                
                                return (
                                  <div 
                                    key={line.id}
                                    style={{
                                      fontSize: 13,
                                      color: refunded ? "#666" : "#ddd",
                                      textDecoration: refunded ? "line-through" : "none",
                                    }}
                                  >
                                    <span style={{ fontWeight: "600" }}>
                                      {line.qty}× {line.name}
                                    </span>
                                    {options.length > 0 && (
                                      <span style={{ color: refunded ? "#555" : "#888", fontSize: 11, marginLeft: 4 }}>
                                        ({options.map((o: any) => o.name).join(", ")})
                                      </span>
                                    )}
                                    {line.note && (
                                      <span style={{ color: refunded ? "#555" : "#fbbf24", fontSize: 11, marginLeft: 4, fontStyle: "italic" }}>
                                        — {line.note}
                                      </span>
                                    )}
                                    {refunded && (
                                      <span style={{
                                        marginLeft: 6,
                                        padding: "2px 6px",
                                        borderRadius: 3,
                                        fontSize: 9,
                                        fontWeight: "600",
                                        background: "#7f1d1d",
                                        color: "#fca5a5",
                                      }}>
                                        REFUNDED
                                      </span>
                                    )}
                                    <span style={{ 
                                      marginLeft: 8, 
                                      color: refunded ? "#555" : "#4ade80",
                                      fontWeight: "600"
                                    }}>
                                      {formatPesos(line.lineTotal)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Total + Actions */}
                          <td style={{ padding: 16, verticalAlign: "top", textAlign: "right" }}>
                            <div style={{ marginBottom: 12 }}>
                              {hasRefunds && (
                                <div style={{ 
                                  fontSize: 12, 
                                  color: "#888", 
                                  textDecoration: "line-through",
                                  marginBottom: 4
                                }}>
                                  {formatPesos(tx.totalCents)}
                                </div>
                              )}
                              <div style={{ 
                                fontSize: 18, 
                                fontWeight: "bold", 
                                color: hasRefunds ? "#fbbf24" : "#4ade80"
                              }}>
                                {formatPesos(netTotal)}
                              </div>
                              {hasRefunds && (
                                <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                                  (after refunds)
                                </div>
                              )}
                            </div>
                            
                            {!isVoided && (
                              <button
                                onClick={() => openRefundModal(tx)}
                                style={{
                                  padding: "8px 16px",
                                  fontSize: 13,
                                  fontWeight: "600",
                                  background: "#dc2626",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                }}
                              >
                                Refund
                              </button>
                            )}
                            
                            {isVoided && (
                              <div style={{
                                padding: "6px 12px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: "600",
                                background: "#7f1d1d",
                                color: "#fca5a5",
                                display: "inline-block",
                              }}>
                                VOIDED
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right-side reporting panel */}
        <div
          style={{
            background: "#111827",
            borderRadius: 8,
            border: "1px solid #374151",
            padding: 16,
            color: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Summary & eJournal
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                {report?.dateLabel || "Select a date from the list"}
              </div>
            </div>
          </div>

          {/* All Categories section */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#020617",
              border: "1px solid #1f2937",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>All Categories</div>
              <button
                type="button"
                onClick={handlePrintCategorySummary}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                🖨️ Print
              </button>
            </div>
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {!report || report.categories.length === 0 ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  No category sales for this date.
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ color: "#9ca3af" }}>
                      <th
                        style={{
                          textAlign: "left",
                          paddingBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          paddingBottom: 4,
                          fontWeight: 500,
                          width: 50,
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          paddingBottom: 4,
                          fontWeight: 500,
                          width: 90,
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories.map((cat) => (
                      <tr key={cat.name}>
                        <td
                          style={{
                            padding: "2px 0",
                            paddingRight: 4,
                          }}
                        >
                          {cat.name}
                        </td>
                        <td
                          style={{
                            padding: "2px 0",
                            textAlign: "right",
                          }}
                        >
                          {cat.qty}
                        </td>
                        <td
                          style={{
                            padding: "2px 0",
                            textAlign: "right",
                            color: "#4ade80",
                            fontWeight: 600,
                          }}
                        >
                          {formatPesos(cat.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* eJournal section */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#020617",
              border: "1px solid #1f2937",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>eJournal</div>
              <button
                type="button"
                onClick={handlePrintEjournal}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                🖨️ Print
              </button>
            </div>

            {/* Cashier filter */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setEjournalCashierFilter("ALL")}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  borderRadius: 999,
                  border:
                    ejournalCashierFilter === "ALL"
                      ? `2px solid ${COLORS.primary}`
                      : "1px solid #4b5563",
                  background:
                    ejournalCashierFilter === "ALL" ? "#111827" : "#020617",
                  color: "#e5e7eb",
                  cursor: "pointer",
                  fontWeight: ejournalCashierFilter === "ALL" ? 700 : 500,
                }}
              >
                All
              </button>
              {(report?.ejournal.cashiers ?? []).map((cashier) => (
                <button
                  key={cashier}
                  type="button"
                  onClick={() => setEjournalCashierFilter(cashier)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    borderRadius: 999,
                    border:
                      ejournalCashierFilter === cashier
                        ? `2px solid ${COLORS.primary}`
                        : "1px solid #4b5563",
                    background:
                      ejournalCashierFilter === cashier ? "#111827" : "#020617",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    fontWeight:
                      ejournalCashierFilter === cashier ? 700 : 500,
                  }}
                >
                  {cashier}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                marginBottom: 8,
                padding: "6px 8px",
                borderRadius: 6,
                background: "#020617",
                border: "1px dashed #374151",
              }}
            >
              <div style={{ color: "#9ca3af" }}>Total Qty</div>
              <div style={{ fontWeight: 700 }}>
                {report?.ejournal.totalQty ?? 0}
              </div>
              <div style={{ color: "#9ca3af" }}>Total Amount</div>
              <div style={{ fontWeight: 700, color: "#4ade80" }}>
                {formatPesos(report?.ejournal.totalAmountCents ?? 0)}
              </div>
            </div>

            {/* Items list */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {!report || report.ejournal.rows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  No items for this filter.
                </div>
              ) : (
                report.ejournal.rows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "6px 4px",
                      borderBottom: "1px solid #111827",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {row.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          display: "flex",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        {row.categoryName && (
                          <span>{row.categoryName}</span>
                        )}
                        <span>|</span>
                        <span>{row.cashier}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        minWidth: 80,
                      }}
                    >
                      <div>{row.qty}×</div>
                      <div
                        style={{
                          color: "#4ade80",
                          fontWeight: 600,
                        }}
                      >
                        {formatPesos(row.amountCents)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundingTransaction && (
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
            zIndex: 1000,
          }}
          onClick={() => setRefundingTransaction(null)}
        >
          <div
            style={{
              background: "#2a2a2a",
              padding: 24,
              borderRadius: 12,
              minWidth: 500,
              maxWidth: 600,
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid #3a3a3a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, color: "#fff" }}>
              Refund Transaction #{refundingTransaction.transactionNo}
            </h2>
            <p style={{ marginBottom: 20, color: "#aaa", fontSize: 14 }}>
              Select items to refund, provide admin PIN and reason.
            </p>

            {/* Item Selection */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontWeight: "600", color: "#ddd", fontSize: 14 }}>
                  Select Items to Refund:
                </label>
                <button
                  onClick={selectAllRefundableLines}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    background: "#3a3a3a",
                    color: "#fff",
                    border: "1px solid #4a4a4a",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Select All
                </button>
              </div>
              
              <div style={{ 
                background: "#1a1a1a", 
                border: "1px solid #3a3a3a", 
                borderRadius: 6,
                padding: 12,
                maxHeight: 300,
                overflow: "auto"
              }}>
                {refundingTransaction.lineItems.map(line => {
                  const refunded = isLineRefunded(line);
                  const isSelected = selectedLineIds.includes(line.id);
                  const options = line.optionsJson ? JSON.parse(line.optionsJson) : [];

                  return (
                    <div
                      key={line.id}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        background: isSelected ? "#3a3a3a" : "#2a2a2a",
                        border: `2px solid ${isSelected ? COLORS.primary : "#3a3a3a"}`,
                        borderRadius: 6,
                        cursor: refunded ? "not-allowed" : "pointer",
                        opacity: refunded ? 0.5 : 1,
                      }}
                      onClick={() => !refunded && toggleLineSelection(line.id)}
                    >
                      <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={refunded}
                          readOnly
                          style={{ 
                            marginTop: 4,
                            cursor: refunded ? "not-allowed" : "pointer",
                            width: 18,
                            height: 18,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: "#fff", fontWeight: "600", marginBottom: 4 }}>
                            {line.qty}× {line.name}
                          </div>
                          {options.length > 0 && (
                            <div style={{ fontSize: 12, color: "#888" }}>
                              {options.map((o: any) => o.name).join(", ")}
                            </div>
                          )}
                          {line.note && (
                            <div style={{ fontSize: 12, color: "#fbbf24", fontStyle: "italic", marginTop: 2 }}>
                              Note: {line.note}
                            </div>
                          )}
                          {refunded && (
                            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: "600" }}>
                              Already refunded
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: "#4ade80", fontWeight: "600" }}>
                          {formatPesos(line.lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin PIN */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: "600", color: "#ddd", fontSize: 14 }}>
                Admin PIN:
              </label>
              <input
                type="password"
                inputMode="none"
                readOnly
                value={refundPin}
                onClick={() => {
                  keyboard.openKeyboard({
                    mode: "pin",
                    value: refundPin,
                    title: "Admin PIN",
                    onChange: setRefundPin,
                    onDone: setRefundPin,
                  });
                }}
                placeholder="Tap to enter PIN"
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 14,
                  background: "#1a1a1a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: "600", color: "#ddd", fontSize: 14 }}>
                Reason:
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                value={refundReason}
                onClick={() => {
                  keyboard.openKeyboard({
                    mode: "text",
                    value: refundReason,
                    title: "Refund Reason",
                    onChange: setRefundReason,
                    onDone: setRefundReason,
                  });
                }}
                placeholder="Tap to enter reason"
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 14,
                  background: "#1a1a1a",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              />
            </div>

            {refundError && (
              <div style={{ 
                padding: 10, 
                marginBottom: 16, 
                background: "#7f1d1d", 
                border: "1px solid #ef4444", 
                borderRadius: 6,
                color: "#fca5a5",
                fontSize: 13
              }}>
                {refundError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleRefundSubmit}
                disabled={refundBusy || selectedLineIds.length === 0 || !refundPin || !refundReason}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: "bold",
                  background: (refundBusy || selectedLineIds.length === 0 || !refundPin || !refundReason) 
                    ? "#444" 
                    : "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: (refundBusy || selectedLineIds.length === 0 || !refundPin || !refundReason) 
                    ? "not-allowed" 
                    : "pointer",
                }}
              >
                {refundBusy ? "Processing..." : `Refund ${selectedLineIds.length} Item(s)`}
              </button>
              <button
                onClick={() => setRefundingTransaction(null)}
                disabled={refundBusy}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: "bold",
                  background: "#3a3a3a",
                  color: "#fff",
                  border: "1px solid #4a4a4a",
                  borderRadius: 6,
                  cursor: refundBusy ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
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
