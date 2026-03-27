"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCloudAdminRoleFromToken, MANAGER_BLOCKED_SETTINGS_PATHS } from "@/lib/cloudAdminRole";

export function SettingsAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (getCloudAdminRoleFromToken() !== "MANAGER") return;
    if (MANAGER_BLOCKED_SETTINGS_PATHS.has(pathname)) {
      router.replace("/settings/staff");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
