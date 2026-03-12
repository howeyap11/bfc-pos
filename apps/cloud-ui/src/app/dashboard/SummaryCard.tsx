"use client";

import { COLORS } from "@/lib/theme";

const CARD_GRADIENTS: Record<string, string> = {
  orange: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)",
  green: "linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)",
  blue: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)",
  pink: "linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)",
};

type SummaryCardProps = {
  title: string;
  value: string;
  gradient?: keyof typeof CARD_GRADIENTS;
  icon?: React.ReactNode;
  loading?: boolean;
};

export function SummaryCard({ title, value, gradient = "blue", icon, loading }: SummaryCardProps) {
  const bg = CARD_GRADIENTS[gradient] ?? CARD_GRADIENTS.blue;
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-black/5"
      style={{ background: bg, color: "rgba(0,0,0,0.85)" }}
    >
      {icon && (
        <div className="absolute right-3 top-3 opacity-20" style={{ color: "inherit" }}>
          {icon}
        </div>
      )}
      {loading ? (
        <div className="h-10 w-24 animate-pulse rounded bg-black/10" />
      ) : (
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      )}
      <div className="mt-1 text-sm font-medium opacity-90">{title}</div>
    </div>
  );
}
