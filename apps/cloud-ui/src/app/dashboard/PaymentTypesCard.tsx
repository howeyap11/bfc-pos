"use client";

import { getPaymentBadgeColor } from "@/lib/theme";
import { formatDateRangeLabel } from "./DateRangeFilter";

const METHOD_TO_KEY: Record<string, string> = {
  Cash: "CASH",
  Card: "CARD",
  GCash: "GCASH",
  FoodPanda: "FOODPANDA",
  Other: "Other",
};

type PaymentTypeTotal = { method: string; amountCents: number; percentage?: number };

type PaymentTypesCardProps = {
  paymentTypes: PaymentTypeTotal[];
  startDate: string;
  endDate: string;
  loading?: boolean;
};

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentTypesCard({
  paymentTypes,
  startDate,
  endDate,
  loading,
}: PaymentTypesCardProps) {
  const rangeLabel = formatDateRangeLabel(startDate, endDate);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">Payment Types</h3>
        <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Payment Types</h3>
      <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
      <div className="space-y-3">
        {paymentTypes.length === 0 ? (
          <p className="text-sm text-gray-500">No payment data in range</p>
        ) : (
          paymentTypes.map((p) => {
            const key = METHOD_TO_KEY[p.method] ?? p.method.toUpperCase().replace(/\s/g, "");
            const color = getPaymentBadgeColor(key);
            return (
              <div key={p.method} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-gray-800">{p.method}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {formatPesos(p.amountCents ?? 0)}
                  </span>
                  {p.percentage != null && p.percentage > 0 && (
                    <span className="ml-1 text-xs text-gray-500">({p.percentage}%)</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
