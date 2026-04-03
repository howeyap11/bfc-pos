"use client";

import { useEffect, useState } from "react";
import { getActiveStaff } from "@/lib/staffAuth";
import { StaffFullInventoryCount } from "@/components/staff/StaffFullInventoryCount";

export default function StaffCountPage() {
  const [draftKey, setDraftKey] = useState<string | null>(null);

  useEffect(() => {
    const s = getActiveStaff();
    setDraftKey(s ? `bfc_staff_count_draft_${s.id}` : null);
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4 text-white sm:px-5 sm:pt-5">
      <p className="mb-6 text-base leading-relaxed text-white/55">
        Enter counts per synced ingredient. Submits a session only — does not overwrite stock.
      </p>
      {draftKey ? (
        <StaffFullInventoryCount draftStorageKey={draftKey} />
      ) : (
        <p className="text-base text-white/50">Sign in again to enable draft save.</p>
      )}
    </main>
  );
}
