"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/menu-settings/sizes", label: "Sizes" },
  { href: "/menu-settings/modifiers", label: "Modifiers" },
  { href: "/menu-settings/add-ons", label: "Add-ons" },
  { href: "/menu-settings/substitutes", label: "Substitutes" },
  { href: "/menu-settings/shots", label: "Shots" },
  { href: "/menu-settings/transaction-types", label: "Transaction Types" },
  { href: "/menu-settings/ingredients", label: "Ingredients" },
];

export function MenuSettingsNav() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-2 border-b border-gray-200">
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
