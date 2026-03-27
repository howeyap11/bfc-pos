import { COLORS } from "@/lib/theme";
import { InventoryCountForm } from "@/components/staff/InventoryCountForm";

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
      <p style={{ color: COLORS.textSecondary, marginBottom: 16 }}>
        Manual inventory count submits a local auditable snapshot and syncs to cloud when online.
      </p>
      <InventoryCountForm source="POS" />
    </div>
  );
}
