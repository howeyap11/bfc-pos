"use client";

import { COLORS } from "@/lib/theme";

export default function ReceiptsPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Receipts</h1>
      <p className="mb-6 text-sm text-white/60">
        Receipt header, footer, and print settings.
      </p>
      <div
        className="rounded-lg border p-6"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
      >
        <p className="text-sm text-white/50">
          Receipt configuration coming soon.
        </p>
      </div>
    </div>
  );
}
