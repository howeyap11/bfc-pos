"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import "./pos-shell.css";
import { useRouter, usePathname } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { clearActiveStaff } from "@/lib/staffAuth";
import PosErrorBoundary from "./pos-error-boundary";
import HealthGate from "./health-gate";
import SyncWorker from "./sync-worker";

const ROUTE_TITLES: Record<string, string> = {
  "/pos/register": "Register",
  "/pos/orders": "Orders",
  "/pos/transactions": "Transactions",
  "/pos/drawer": "Cash Drawer",
  "/pos/inventory": "Inventory",
  "/pos/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  return ROUTE_TITLES[pathname] ?? "BFC POS";
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; role: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bfc_active_staff");
      if (stored) {
        const staff = JSON.parse(stored);
        setActiveStaff(staff);
      } else {
        setActiveStaff(null);
      }
    } catch (e) {
      console.error("[Layout] Failed to load active staff", e);
      setActiveStaff(null);
    }
  }, [pathname]);

  // Body scroll lock when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add("pos-drawer-open");
    } else {
      document.body.classList.remove("pos-drawer-open");
    }
    return () => document.body.classList.remove("pos-drawer-open");
  }, [drawerOpen]);

  // Escape key closes drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const menuItems = [
    { label: "Register", route: "/pos/register" },
    { label: "Orders", route: "/pos/orders" },
    { label: "Transactions", route: "/pos/transactions" },
    { label: "Open Drawer", route: "/pos/drawer" },
    { label: "Inventory", route: "/pos/inventory" },
    { label: "Settings", route: "/pos/settings" },
  ];

  const handleMenuClick = useCallback(
    (item: { route: string }) => {
      if (item.route) {
        router.push(item.route);
        setDrawerOpen(false);
      }
    },
    [router]
  );

  const handleLogout = useCallback(() => {
    clearActiveStaff();
    setDrawerOpen(false);
    router.push("/pos/staff");
  }, [router]);

  const CUSTOMER_DISPLAY_WINDOW_NAME = "bfc_customer_display";
  function openCustomerDisplay() {
    const w = window.open(
      "/pos/customer-display",
      CUSTOMER_DISPLAY_WINDOW_NAME,
      "width=900,height=1000"
    );
    if (w) w.focus();
  }

  const isCustomerDisplay = pathname === "/pos/customer-display";
  const pageTitle = getPageTitle(pathname);

  if (isCustomerDisplay) {
    return (
      <PosErrorBoundary>
        <HealthGate>{children}</HealthGate>
      </PosErrorBoundary>
    );
  }

  return (
    <PosErrorBoundary>
      <HealthGate>
        <div
          data-pos-shell
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            background: COLORS.bgDarkest,
            color: COLORS.textPrimary,
          }}
        >
          {/* Top Bar - compact on mobile */}
          <header
            className="pos-header-compact"
            style={{
              flex: "0 0 auto",
              minHeight: 50,
              background: "#0a0a0a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              borderBottom: `2px solid ${COLORS.primary}`,
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
                  fontSize: 22,
                  cursor: "pointer",
                  padding: 8,
                  flexShrink: 0,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                ☰
              </button>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(16px, 4vw, 20px)",
                  fontWeight: "bold",
                  color: COLORS.primary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {pageTitle}
              </h1>
              <button
                type="button"
                onClick={openCustomerDisplay}
                aria-label="Open Customer Display"
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span className="pos-customer-display-text">Customer Display</span>
                <span className="pos-customer-display-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </span>
              </button>
            </div>

            {activeStaff && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                <span style={{ opacity: 0.9 }} aria-hidden>👤</span>
                <span style={{ opacity: 0.9 }}>{activeStaff.name}</span>
                <span style={{ opacity: 0.7, fontSize: 12 }}>({activeStaff.role})</span>
              </div>
            )}
          </header>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
              background: COLORS.bgDarkest,
            }}
          >
            <SyncWorker />
            {children}

            {/* Left Drawer */}
            {drawerOpen && (
              <>
                <div
                  className="pos-drawer-backdrop"
                  role="presentation"
                  aria-hidden
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 100,
                  }}
                />
                <div
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation menu"
                  className="pos-drawer-panel"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 280,
                    maxWidth: "85vw",
                    background: COLORS.bgDarker,
                    boxShadow: "2px 0 12px rgba(0,0,0,0.5)",
                    zIndex: 101,
                    overflowY: "auto",
                    borderRight: `1px solid ${COLORS.borderLight}`,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ padding: 16, flex: 1, minHeight: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                      }}
                    >
                      <h2 style={{ margin: 0, fontSize: 18, color: COLORS.primary, fontWeight: "bold" }}>
                        {pageTitle}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Close menu"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#fff",
                          fontSize: 24,
                          cursor: "pointer",
                          padding: 8,
                          lineHeight: 1,
                          minWidth: 44,
                          minHeight: 44,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <nav>
                      {menuItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleMenuClick(item)}
                          style={{
                            width: "100%",
                            padding: 14,
                            marginBottom: 8,
                            textAlign: "left",
                            background: pathname === item.route ? COLORS.primaryLight : COLORS.bgPanel,
                            border:
                              pathname === item.route
                                ? `2px solid ${COLORS.primary}`
                                : `1px solid ${COLORS.borderLight}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: pathname === item.route ? "bold" : "normal",
                            color: pathname === item.route ? COLORS.primary : COLORS.textPrimary,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderTop: `1px solid ${COLORS.borderLight}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: 14,
                        fontSize: 15,
                        fontWeight: 600,
                        background: COLORS.primary,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </HealthGate>
    </PosErrorBoundary>
  );
}
