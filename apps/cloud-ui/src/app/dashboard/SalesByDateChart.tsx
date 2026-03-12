"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatDateRangeLabel } from "./DateRangeFilter";

type SalesByDateChartProps = {
  buckets: { label: string; date: string; amountCents: number }[];
  startDate: string;
  endDate: string;
  granularity: "hourly" | "daily" | "monthly";
  onGranularityChange: (g: "hourly" | "daily" | "monthly") => void;
  loading?: boolean;
};

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesByDateChart({
  buckets,
  startDate,
  endDate,
  granularity,
  onGranularityChange,
  loading,
}: SalesByDateChartProps) {
  const data = buckets.map((b) => ({ ...b, amount: b.amountCents / 100 }));
  const rangeLabel = formatDateRangeLabel(startDate, endDate);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">Sales by Date</h3>
        <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
        <div className="flex gap-2">
          {(["hourly", "daily", "monthly"] as const).map((g) => (
            <button key={g} type="button" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm capitalize text-gray-500">
              {g}
            </button>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Sales by Date</h3>
      <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
      <div className="mb-4 flex gap-2">
        {(["hourly", "daily", "monthly"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGranularityChange(g)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              granularity === g
                ? "bg-teal-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          No sales data in this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
            />
            <Tooltip
              formatter={(value: unknown) => [formatPesos(Math.round(Number(value ?? 0) * 100)), "Sales"]}
              labelFormatter={(label) => `Bucket: ${label}`}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#0d9488"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
