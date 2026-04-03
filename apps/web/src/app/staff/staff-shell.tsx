"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getActiveStaff } from "@/lib/staffAuth";

const PUBLIC_PREFIX = "/staff/login";

/** Dark café / kiosk surface for staff app (matches /staff home mockup) */
const STAFF_BG = "#1c1917";

function isStaffHomePath(pathname: string | null): boolean {
  if (!pathname) return false;
  const n = pathname.replace(/\/+$/, "") || "/";
  return n === "/staff";
}

function normalizePath(pathname: string | null): string {
  if (!pathname) return "";
  return pathname.replace(/\/+$/, "") || "/";
}

function subpageTitle(pathname: string | null): string | null {
  const n = normalizePath(pathname);
  const titles: Record<string, string> = {
    "/staff/waste": "Waste",
    "/staff/count": "Manual Inventory",
    "/staff/sop": "SOP Checklist",
    "/staff/incentives": "Incentives",
    "/staff/manager": "Manager",
  };
  return titles[n] ?? null;
}

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = pathname === PUBLIC_PREFIX || pathname?.startsWith(`${PUBLIC_PREFIX}/`);

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }
    if (!getActiveStaff()) {
      router.replace("/staff/login");
      return;
    }
    setReady(true);
  }, [isPublic, pathname, router]);

  if (!isPublic && !ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white/60"
        style={{ backgroundColor: STAFF_BG }}
      >
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  const isStaffHome = isStaffHomePath(pathname);
  const title = !isPublic && !isStaffHome ? subpageTitle(pathname) : null;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: STAFF_BG }}>
      {title && <StaffMobileSubheader title={title} onBack={() => router.push("/staff")} />}
      {children}
    </div>
  );
}

function StaffMobileSubheader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-md"
      style={{ backgroundColor: "rgba(28, 25, 23, 0.94)" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3 sm:px-4 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/16 active:bg-white/12"
          aria-label="Back to staff home"
        >
          <span className="text-[1.75rem] font-light leading-none" aria-hidden>
            ‹
          </span>
        </button>
        <h1 className="min-w-0 flex-1 truncate pl-1 text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]">
          {title}
        </h1>
      </div>
    </header>
  );
}
