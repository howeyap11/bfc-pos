"use client";

import { useState, useEffect } from "react";
import "./pos-shell.css";
import { useRouter, usePathname } from "next/navigation";
import { COLORS } from "@/lib/theme";
import PosErrorBoundary from "./pos-error-boundary";
import HealthGate from "./health-gate";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; role: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for active staff on mount and when pathname changes
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

  const menuItems = [
    { label: "Register", route: "/pos/register" },
    { label: "Orders", route: "/pos/orders" },
    { label: "Transactions", route: "/pos/transactions" },
    { label: "Open Drawer", route: "/pos/drawer" },
    { label: "Inventory", route: "/pos/inventory" },
    { label: "Settings", route: "/pos/settings" },
  ];

  function handleMenuClick(item: typeof menuItems[0]) {
    if (item.route) {
      router.push(item.route);
      setDrawerOpen(false);
    }
  }

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
      {/* Top Bar */}
      <div
        style={{
          height: 50,
          background: "#0a0a0a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          borderBottom: `2px solid ${COLORS.primary}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              padding: "4px 8px",
              marginRight: 16,
            }}
          >
            ☰
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>BFC POS</h1>
          <button
            type="button"
            onClick={openCustomerDisplay}
            style={{
              marginLeft: 16,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Customer Display
          </button>
        </div>
        
        {/* Active Staff Display */}
        {activeStaff && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <span style={{ opacity: 0.9 }}>👤 {activeStaff.name}</span>
            <span style={{ opacity: 0.7, fontSize: 12 }}>({activeStaff.role})</span>
          </div>
        )}
      </div>

      {/* Main Content — minHeight:0 so nested POS flex + scroll regions can shrink (mini PC / short viewports) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          background: COLORS.bgDarkest,
        }}
      >
        {children}

        {/* Left Drawer */}
        {drawerOpen && (
          <>
            <div
              style={{
                position: "fixed",
                top: 50,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 100,
              }}
              onClick={() => setDrawerOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                top: 50,
                left: 0,
                bottom: 0,
                width: 280,
                background: COLORS.bgDarker,
                boxShadow: "2px 0 12px rgba(0,0,0,0.5)",
                zIndex: 101,
                overflowY: "auto",
                borderRight: `1px solid ${COLORS.borderLight}`,
              }}
            >
              <div style={{ padding: 16 }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: 18, color: COLORS.textPrimary }}>Menu</h2>
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuClick(item)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: 8,
                      textAlign: "left",
                      background: pathname === item.route ? COLORS.primaryLight : COLORS.bgPanel,
                      border:
                        pathname === item.route
                          ? `2px solid ${COLORS.primary}`
                          : `1px solid ${COLORS.borderLight}`,
                      borderRadius: 4,
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
