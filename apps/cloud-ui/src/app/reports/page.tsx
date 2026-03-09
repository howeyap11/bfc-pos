import { COLORS } from "@/lib/theme";

export default function ReportsPage() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: COLORS.bgDark, color: "#ddd" }}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-semibold text-white">Reports</h1>
        <div
          className="rounded-lg border p-8 text-center"
          style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
        >
          <p className="text-white/70">Reports coming soon.</p>
        </div>
      </div>
    </div>
  );
}
