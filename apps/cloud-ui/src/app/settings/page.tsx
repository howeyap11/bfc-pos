"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCloudAdminRoleFromToken } from "@/lib/cloudAdminRole";

export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    const dest =
      getCloudAdminRoleFromToken() === "MANAGER" ? "/settings/staff" : "/settings/business-details";
    router.replace(dest);
  }, [router]);
  return (
    <div className="p-6 text-sm text-white/60" style={{ color: "#888" }}>
      Redirecting…
    </div>
  );
}
