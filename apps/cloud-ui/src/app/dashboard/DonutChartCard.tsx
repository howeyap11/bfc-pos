"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getPaymentBadgeColor } from "@/lib/theme";
import { formatDateRangeLabel } from "./DateRangeFilter";

const DONUT_COLORS = [
  "#0d9488",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

const CHART_HEIGHT = 260;
const LEGEND_MAX_HEIGHT = 200;

type DonutChartCardProps = {
  title: string;
  data: { name: string; value: number }[];
  startDate: string;
  endDate: string;
  getColor?: (name: string) => string;
  loading?: boolean;
};

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function entryColor(
  entry: { name: string },
  index: number,
  getColor?: (name: string) => string
): string {
  return getColor ? getColor(entry.name) : DONUT_COLORS[index % DONUT_COLORS.length];
}

export function DonutChartCard({
  title,
  data,
  startDate,
  endDate,
  getColor,
  loading,
}: DonutChartCardProps) {
  const rangeLabel = formatDateRangeLabel(startDate, endDate);
  const chartData = data.map((d) => ({ ...d, value: d.value / 100 }));

  if (loading) {
    return (
      <div className="flex min-h-[360px] max-h-[520px] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <h3 className="shrink-0 text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mb-3 shrink-0 text-sm text-gray-500">{rangeLabel}</p>
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ height: CHART_HEIGHT, width: "100%" }}
        >
          <div className="h-44 w-44 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="mt-3 min-h-0 flex-1 rounded border border-gray-100 bg-gray-50/50" style={{ maxHeight: LEGEND_MAX_HEIGHT }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[360px] max-h-[520px] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <h3 className="shrink-0 text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mb-3 shrink-0 text-sm text-gray-500">{rangeLabel}</p>
      {chartData.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center text-sm text-gray-500">
          No data in range
        </div>
      ) : (
        <>
          <div className="w-full shrink-0" style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entryColor(entry, index, getColor)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => formatPesos(Math.round(Number(value ?? 0) * 100))}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-gray-100 pt-2 pr-1"
            style={{ maxHeight: LEGEND_MAX_HEIGHT }}
            role="list"
            aria-label={`${title} legend`}
          >
            <ul className="space-y-1.5 text-xs text-gray-700">
              {chartData.map((entry, index) => (
                <li key={`${entry.name}-${index}`} className="flex items-start gap-2" role="listitem">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entryColor(entry, index, getColor) }}
                    aria-hidden
                  />
                  <span className="min-w-0 break-words leading-snug">
                    <span className="font-medium text-gray-800">{entry.name}</span>
                    <span className="text-gray-500"> — {formatPesos(Math.round(entry.value * 100))}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export function salesByPaymentColor(name: string): string {
  const key = name.toUpperCase().replace(/\s/g, "");
  return getPaymentBadgeColor(key);
}
