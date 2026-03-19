import { COLORS } from "@/lib/theme";

export default function InventoryPage() {
  return (
    <div
      style={{
        padding: 24,
        minHeight: "100%",
        background: COLORS.bgDarkest,
        color: COLORS.textPrimary,
      }}
    >
      <h1 style={{ marginTop: 0 }}>Inventory</h1>
      <p style={{ color: COLORS.textSecondary }}>Manual inventory count entry will be added here.</p>
    </div>
  );
}
