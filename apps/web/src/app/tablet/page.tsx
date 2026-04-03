"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TABLET_NAV, firstTabletSectionPath } from "@/lib/tabletNav";
import { useTabletNav } from "./tablet-nav-context";

export default function TabletHomePage() {
  const { nav } = useTabletNav();
  const router = useRouter();

  useEffect(() => {
    const n = nav ?? DEFAULT_TABLET_NAV;
    /* When every content tab is off, firstTabletSectionPath is /tablet/settings (self-lockout-safe). */
    router.replace(firstTabletSectionPath(n));
  }, [nav, router]);

  return (
    <div style={{ padding: 28, fontSize: 18, color: "#94a3b8", textAlign: "center" }}>
      Starting tablet…
    </div>
  );
}
