"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { getCloudAdminRoleFromToken } from "@/lib/cloudAdminRole";

const SECTIONS = [
  {
    group: "General",
    items: [
      { href: "/settings/business-details", label: "Business Details" },
      { href: "/settings/subscription", label: "Subscription" },
    ],
  },
  {
    group: "System Setup",
    items: [
      { href: "/settings/receipts", label: "Receipts" },
      { href: "/settings/sales-inventory", label: "Sales & Inventory" },
    ],
  },
  {
    group: "Security",
    items: [
      { href: "/settings/password-pins", label: "Password & PIN Codes" },
      { href: "/settings/staff", label: "Staff (POS Login)" },
    ],
  },
  {
    group: "POS Settings",
    items: [
      { href: "/settings/devices", label: "POS Devices" },
    ],
  },
  {
    group: "Dev",
    items: [{ href: "/settings/dev", label: "Dev" }],
  },
];

const MANAGER_SECTIONS = [
  {
    group: "Security",
    items: [{ href: "/settings/staff", label: "Staff (POS Login)" }],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const sections = getCloudAdminRoleFromToken() === "MANAGER" ? MANAGER_SECTIONS : SECTIONS;
  return (
    <nav
      className="w-56 shrink-0 space-y-6 pr-6"
      style={{ borderRight: `1px solid ${COLORS.borderLight}` }}
    >
      {sections.map(({ group, items }) => (
        <div key={group}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            {group}
          </h3>
          <ul className="space-y-1">
            {items.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded px-3 py-2 text-sm transition-colors ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
