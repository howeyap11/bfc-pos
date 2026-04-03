"use client";

function IconHamburger({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/transactions") return "Transactions";
  if (pathname === "/items" || pathname.startsWith("/items/")) return "Items";
  if (pathname === "/inventory" || pathname.startsWith("/inventory/")) return "Inventory";
  if (pathname === "/staff-ops") return "Staff ops";
  if (pathname === "/staff-ops/work-log") return "Work log";
  if (pathname.startsWith("/staff-ops/attendance")) return "Attendance";
  if (pathname.startsWith("/staff-ops/waste-reports")) return "Waste Reports";
  if (pathname.startsWith("/staff-ops/inventory-counts")) return "Inventory Counts";
  if (pathname.startsWith("/staff-ops/sop-submissions")) return "SOP Submissions";
  if (pathname.startsWith("/staff-ops/groups")) return "Groups";
  if (pathname.startsWith("/staff-ops/")) return "Staff ops";
  if (pathname === "/ingredients" || pathname.startsWith("/ingredients/")) return "Ingredients";
  if (pathname === "/menu" || pathname.startsWith("/menu/")) return "Menu";
  if (pathname.startsWith("/menu-settings")) return "Menu Settings";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname === "/categories" || pathname.startsWith("/categories/")) return "Categories";
  if (pathname === "/options" || pathname.startsWith("/options/")) return "Options";
  return "Cloud Admin";
}

type MobileHeaderProps = {
  onMenuClick: () => void;
  pathname: string;
};

export function MobileHeader({ onMenuClick, pathname }: MobileHeaderProps) {
  const title = getPageTitle(pathname);
  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-[#2c2c2c] px-4 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
        aria-label="Open menu"
      >
        <IconHamburger className="h-6 w-6" />
      </button>
      <h1 className="min-w-0 flex-1 text-base font-semibold text-teal-400">{title}</h1>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
        aria-label="Info"
      >
        <IconInfo className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/30 text-white hover:bg-teal-500/40"
        aria-label="Notifications"
      >
        <IconBell className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/30 text-white hover:bg-teal-500/40"
        aria-label="Profile"
      >
        <IconUser className="h-5 w-5" />
      </button>
    </header>
  );
}
