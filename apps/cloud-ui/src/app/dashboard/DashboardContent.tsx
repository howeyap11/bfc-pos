"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  type DashboardSummary,
  type SalesByDateBucket,
  type PaymentTypeTotal,
  type SalesByCategoryRow,
  type SalesByItemRow,
  type SalesByCashierRow,
  type SalesByPaymentRow,
  type ItemsSoldRow,
} from "@/lib/api";
import { SummaryCard } from "./SummaryCard";
import { DateRangeFilter } from "./DateRangeFilter";
import { SalesByDateChart } from "./SalesByDateChart";
import { PaymentTypesCard } from "./PaymentTypesCard";
import { DonutChartCard, salesByPaymentColor } from "./DonutChartCard";
import { ItemsSoldTable } from "./ItemsSoldTable";

function getDefaultDates(): { startDate: string; endDate: string } {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  const date = `${y}-${m}-${d}`;
  return { startDate: date, endDate: date };
}

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return "Last synced: —";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s/gi, "");
  return `Last synced at ${datePart}, ${timePart}`;
}

export function DashboardContent() {
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(() => searchParams.get("startDate") || getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(() => searchParams.get("endDate") || getDefaultDates().endDate);
  const [granularity, setGranularity] = useState<"hourly" | "daily" | "monthly">("hourly");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [buckets, setBuckets] = useState<SalesByDateBucket[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeTotal[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategoryRow[]>([]);
  const [salesByItem, setSalesByItem] = useState<SalesByItemRow[]>([]);
  const [salesByCashier, setSalesByCashier] = useState<SalesByCashierRow[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<SalesByPaymentRow[]>([]);
  const [itemsSold, setItemsSold] = useState<ItemsSoldRow[]>([]);
  const [itemsSoldTotal, setItemsSoldTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [summaryRes, salesByDateRes, paymentRes, catRes, itemRes, cashierRes, paymentDonutRes, itemsRes] =
        await Promise.all([
          api.getDashboardSummary({ startDate, endDate }),
          api.getDashboardSalesByDate({ startDate, endDate, granularity }),
          api.getDashboardPaymentTypes({ startDate, endDate }),
          api.getDashboardSalesByCategory({ startDate, endDate }),
          api.getDashboardSalesByItem({ startDate, endDate }),
          api.getDashboardSalesByCashier({ startDate, endDate }),
          api.getDashboardSalesByPayment({ startDate, endDate }),
          api.getDashboardItemsSold({ startDate, endDate, sortBy: "amount", order: "desc", page: 1, pageSize: 10 }),
        ]);

      setSummary(summaryRes);
      setBuckets(salesByDateRes.buckets ?? []);
      setPaymentTypes(paymentRes.paymentTypes ?? []);
      setSalesByCategory(catRes.rows ?? []);
      setSalesByItem(itemRes.rows ?? []);
      setSalesByCashier(cashierRes.rows ?? []);
      setSalesByPayment(paymentDonutRes.rows ?? []);
      setItemsSold(itemsRes.rows ?? []);
      setItemsSoldTotal(itemsRes.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, granularity]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    window.history.replaceState({}, "", url.toString());
  }, [startDate, endDate]);

  const storeName = summary?.storeName ?? "Store";
  const kpis = summary?.kpis;

  return (
    <div className="min-h-screen bg-teal-50/60">
      <div className="mx-auto max-w-7xl p-6">
        {/* 1. Top summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard
            title="Total Net Sales"
            value={kpis ? formatPesos(kpis.totalNetSalesCents) : "—"}
            gradient="orange"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="No. of Transactions"
            value={kpis ? String(kpis.transactionCount) : "—"}
            gradient="green"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="No. of Items"
            value={kpis ? String(kpis.itemsCount) : "—"}
            gradient="blue"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="Total Refunds"
            value={kpis ? formatPesos(kpis.totalRefundsCents) : "—"}
            gradient="green"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="Total Discounts"
            value={kpis ? formatPesos(kpis.totalDiscountsCents) : "—"}
            gradient="blue"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="Cost of Goods"
            value={kpis ? formatPesos(kpis.costOfGoodsCents) : "—"}
            gradient="orange"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="Profit"
            value={kpis ? formatPesos(kpis.profitCents) : "—"}
            gradient="green"
            loading={loading && !kpis}
          />
          <SummaryCard
            title="Total Online Orders"
            value={kpis ? String(kpis.totalOnlineOrdersCount) : "—"}
            gradient="blue"
            loading={loading && !kpis}
          />
        </div>

        {/* 2. Greeting + date filter + last synced */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-teal-900">
            {getGreeting()}, {storeName}!
          </h2>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            disabled={loading}
          />
            <p className="text-sm text-teal-700/80">{formatLastSynced(summary?.lastSyncedAt ?? null)}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
            <button
              type="button"
              onClick={() => load()}
              className="ml-2 font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* 3. Sales by Date chart + 4. Payment Types card */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesByDateChart
              buckets={buckets}
              startDate={startDate}
              endDate={endDate}
              granularity={granularity}
              onGranularityChange={setGranularity}
              loading={loading}
            />
          </div>
          <div>
            <PaymentTypesCard
              paymentTypes={paymentTypes}
              startDate={startDate}
              endDate={endDate}
              loading={loading}
            />
          </div>
        </div>

        {/* 5. Four donut charts */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DonutChartCard
            title="Sales by Category"
            data={salesByCategory.map((r) => ({ name: r.category, value: r.amountCents }))}
            startDate={startDate}
            endDate={endDate}
            loading={loading}
          />
          <DonutChartCard
            title="Sales by Item"
            data={salesByItem.map((r) => ({ name: r.item, value: r.amountCents }))}
            startDate={startDate}
            endDate={endDate}
            loading={loading}
          />
          <DonutChartCard
            title="Sales by Cashier"
            data={salesByCashier.map((r) => ({ name: r.cashier, value: r.amountCents }))}
            startDate={startDate}
            endDate={endDate}
            loading={loading}
          />
          <DonutChartCard
            title="Sales by Payment"
            data={salesByPayment.map((r) => ({ name: r.method, value: r.amountCents }))}
            startDate={startDate}
            endDate={endDate}
            getColor={salesByPaymentColor}
            loading={loading}
          />
        </div>

        {/* 6. List of Items Sold table */}
        <ItemsSoldTable
          startDate={startDate}
          endDate={endDate}
          initialRows={itemsSold}
          initialTotal={itemsSoldTotal}
          initialPage={1}
          initialPageSize={10}
          initialSortBy="amount"
          initialOrder="desc"
        />
      </div>
    </div>
  );
}
