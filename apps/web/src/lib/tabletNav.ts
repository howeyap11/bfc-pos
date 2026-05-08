export type TabletNavConfig = {
  showPending: boolean;
  showQr: boolean;
  showKitchen: boolean;
  showStaff: boolean;
};

export const DEFAULT_TABLET_NAV: TabletNavConfig = {
  showPending: true,
  showQr: true,
  showKitchen: true,
  showStaff: true,
};

export function normalizeTabletNav(raw: unknown): TabletNavConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TABLET_NAV };
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_TABLET_NAV;
  return {
    showPending: typeof o.showPending === "boolean" ? o.showPending : d.showPending,
    showQr: typeof o.showQr === "boolean" ? o.showQr : d.showQr,
    showKitchen: typeof o.showKitchen === "boolean" ? o.showKitchen : d.showKitchen,
    showStaff: typeof o.showStaff === "boolean" ? o.showStaff : d.showStaff,
  };
}

/** First content route allowed by nav; falls back to settings. */
export function firstTabletSectionPath(nav: TabletNavConfig): string {
  if (nav.showPending) return "/tablet/pending-orders";
  if (nav.showQr) return "/tablet/qr";
  if (nav.showKitchen) return "/tablet/kitchen";
  if (nav.showStaff) return "/tablet/staff";
  return "/tablet/settings";
}

export function isTabletSectionAllowed(pathname: string, nav: TabletNavConfig): boolean {
  if (!pathname.startsWith("/tablet")) return true;
  if (pathname === "/tablet" || pathname === "/tablet/") return true;
  if (pathname.startsWith("/tablet/settings")) return true;
  if (pathname.startsWith("/tablet/pending")) return nav.showPending;
  if (pathname.startsWith("/tablet/qr")) return nav.showQr;
  if (pathname.startsWith("/tablet/kitchen")) return nav.showKitchen;
  if (pathname.startsWith("/tablet/staff")) return nav.showStaff;
  /* Unknown /tablet/... — do not allow (redirect to first allowed). */
  return false;
}

export function tabletSectionTitle(pathname: string): string {
  if (pathname.startsWith("/tablet/settings")) return "Settings";
  if (pathname.startsWith("/tablet/pending")) return "Pending orders";
  if (pathname.startsWith("/tablet/qr")) return "QR orders";
  if (pathname.startsWith("/tablet/kitchen")) return "Kitchen";
  if (pathname.startsWith("/tablet/staff")) return "Staff";
  if (pathname === "/tablet" || pathname === "/tablet/") return "Tablet";
  return "Tablet";
}

function navConfigsEqual(a: TabletNavConfig, b: TabletNavConfig): boolean {
  return (
    a.showPending === b.showPending &&
    a.showQr === b.showQr &&
    a.showKitchen === b.showKitchen &&
    a.showStaff === b.showStaff
  );
}

export function isTabletNavDirty(draft: TabletNavConfig, baseline: TabletNavConfig | null): boolean {
  if (!baseline) return false;
  return !navConfigsEqual(draft, baseline);
}
