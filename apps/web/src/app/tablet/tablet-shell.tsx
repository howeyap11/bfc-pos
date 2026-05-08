"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import {
  DEFAULT_TABLET_NAV,
  firstTabletSectionPath,
  isTabletSectionAllowed,
  normalizeTabletNav,
  tabletSectionTitle,
  type TabletNavConfig,
} from "@/lib/tabletNav";
import { TabletNavContext } from "./tablet-nav-context";

const TOP = 56;
const DRAWER_W = 320;
const WEB_VERSION = process.env.NEXT_PUBLIC_POS_VERSION ?? "0.1.0";

const NAV_DEF = [
  { label: "Pending orders", href: "/tablet/pending-orders", key: "showPending" as const },
  { label: "QR orders", href: "/tablet/qr", key: "showQr" as const },
  { label: "Kitchen display", href: "/tablet/kitchen", key: "showKitchen" as const },
  { label: "Staff", href: "/tablet/staff", key: "showStaff" as const },
];

export default function TabletShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nav, setNav] = useState<TabletNavConfig | null>(null);

  const reloadNav = useCallback(async () => {
    try {
      const res = await fetch("/api/store-config", { cache: "no-store" });
      const data = await res.json();
      /*
       * Intentional fallback: older local DBs may not have tabletNavJson yet, or the proxy may
       * return a partial payload — normalizeTabletNav always yields a full shape without throwing.
       */
      const next = normalizeTabletNav(data?.tabletNav);
      setNav((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    } catch {
      setNav((prev) => (prev === null ? { ...DEFAULT_TABLET_NAV } : prev));
    }
  }, []);

  useEffect(() => {
    void reloadNav();
  }, [reloadNav]);

  const effectiveNav = nav ?? DEFAULT_TABLET_NAV;

  /* When saved settings disable the current section, leave immediately (same device or after reloadNav). */
  useEffect(() => {
    if (!nav) return;
    if (pathname === "/tablet" || pathname === "/tablet/") return;
    if (!isTabletSectionAllowed(pathname, effectiveNav)) {
      router.replace(firstTabletSectionPath(effectiveNav));
    }
  }, [nav, pathname, effectiveNav, router]);

  /* Re-check when user returns to tab (e.g. changed settings in another window). */
  useEffect(() => {
    const onFocus = () => {
      void reloadNav();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadNav]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const visibleNavItems = useMemo(() => {
    return NAV_DEF.filter((item) => effectiveNav[item.key]);
  }, [effectiveNav]);

  const ctx = useMemo(() => ({ nav, reloadNav }), [nav, reloadNav]);

  const sectionTitle = tabletSectionTitle(pathname);

  function isActive(href: string) {
    if (href === "/tablet/settings") return pathname.startsWith("/tablet/settings");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <TabletNavContext.Provider value={ctx}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: COLORS.bgDarkest,
          color: COLORS.textPrimary,
        }}
      >
        <div
          style={{
            height: TOP,
            flexShrink: 0,
            background: "#0a0a0a",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px 0 8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            borderBottom: `2px solid ${COLORS.primary}`,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 30,
                cursor: "pointer",
                padding: 12,
                minWidth: 56,
                minHeight: 56,
                lineHeight: 1,
                borderRadius: 10,
                flexShrink: 0,
              }}
            >
              ☰
            </button>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.75, letterSpacing: 0.5 }}>BFC Tablet</h1>
              <div
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={sectionTitle}
              >
                {sectionTitle}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>v{WEB_VERSION}</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
          {children}

          {drawerOpen && (
            <>
              <div
                role="presentation"
                aria-hidden
                style={{
                  position: "fixed",
                  top: TOP,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 100,
                }}
                onClick={() => setDrawerOpen(false)}
              />
              <nav
                aria-label="Tablet navigation"
                style={{
                  position: "fixed",
                  top: TOP,
                  left: 0,
                  bottom: 0,
                  width: DRAWER_W,
                  maxWidth: "min(100vw - 48px, 360px)",
                  background: COLORS.bgDarker,
                  boxShadow: "2px 0 12px rgba(0,0,0,0.5)",
                  zIndex: 101,
                  overflowY: "auto",
                  borderRight: `1px solid ${COLORS.borderLight}`,
                  padding: 16,
                }}
              >
                <h2 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 800, color: COLORS.textPrimary }}>Menu</h2>
                {visibleNavItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setDrawerOpen(false);
                    }}
                    style={{
                      width: "100%",
                      minHeight: 60,
                      padding: "16px 18px",
                      marginBottom: 10,
                      textAlign: "left",
                      background: isActive(item.href) ? COLORS.primaryLight : COLORS.bgPanel,
                      border: isActive(item.href) ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.borderLight}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      fontSize: 19,
                      fontWeight: isActive(item.href) ? 800 : 600,
                      color: isActive(item.href) ? COLORS.primary : COLORS.textPrimary,
                      boxShadow: isActive(item.href) ? `inset 0 0 0 1px ${COLORS.primary}` : undefined,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    router.push("/tablet/settings");
                    setDrawerOpen(false);
                  }}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    padding: "16px 18px",
                    marginTop: 8,
                    marginBottom: 10,
                    textAlign: "left",
                    background: isActive("/tablet/settings") ? COLORS.primaryLight : COLORS.bgPanel,
                    border: isActive("/tablet/settings") ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.borderLight}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    fontSize: 19,
                    fontWeight: isActive("/tablet/settings") ? 800 : 600,
                    color: isActive("/tablet/settings") ? COLORS.primary : COLORS.textSecondary,
                  }}
                >
                  Settings (admin PIN)
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </TabletNavContext.Provider>
  );
}
