"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardNav } from "@/components/DashboardNav";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileDrawer } from "@/components/MobileDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AuthGuard>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardNav />
      </div>

      {/* Mobile header + drawer - visible only on mobile */}
      <div className="md:hidden">
        <MobileHeader onMenuClick={() => setDrawerOpen(true)} pathname={pathname} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main content - full width on mobile, offset by sidebar on desktop */}
      <main className="flex min-h-screen flex-col overflow-hidden bg-white md:ml-[224px]">
        {/* Top padding on mobile for fixed header */}
        <div className="h-14 shrink-0 md:hidden" aria-hidden="true" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </main>
    </AuthGuard>
  );
}
