// Utak / POS style theme (shared with admin Items layout)
export const COLORS = {
  primary: "#C9A227",
  primaryDark: "#A8841F",
  bgDark: "#1f1f1f",
  bgDarker: "#0a0a0a",
  bgPanel: "#2a2a2a",
  borderDark: "#2a2a2a",
  borderLight: "#3a3a3a",
};

/** Payment method badge colors - aligned with POS. Unknown methods use neutral gray. */
export const PAYMENT_BADGE_COLORS: Record<string, string> = {
  CASH: "#22c55e",
  CARD: "#f97316",
  GCASH: "#3b82f6",
  FOODPANDA: "#ec4899",
  PAYMONGO: "#6366f1",
  GRABFOOD: "#10b981",
  BFCAPP: "#f59e0b",
};

export function getPaymentBadgeColor(method: string): string {
  return PAYMENT_BADGE_COLORS[method] ?? "#6b7280";
}
