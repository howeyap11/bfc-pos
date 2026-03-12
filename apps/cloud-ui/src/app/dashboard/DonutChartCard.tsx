"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
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
      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
        <div className="mx-auto h-48 w-48 animate-pulse rounded-full bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          No data in range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    getColor
                      ? getColor(entry.name)
                      : DONUT_COLORS[index % DONUT_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => formatPesos(Math.round(Number(value ?? 0) * 100))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              formatter={(value, entry: { payload?: { value?: number } }) =>
                `${value} - ${formatPesos(Math.round(Number(entry?.payload?.value ?? 0) * 100))}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function salesByPaymentColor(name: string): string {
  const key = name.toUpperCase().replace(/\s/g, "");
  return getPaymentBadgeColor(key);
}
