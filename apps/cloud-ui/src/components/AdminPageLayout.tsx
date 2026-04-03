"use client";

/**
 * Standard scrollable content area for cloud admin pages (matches dashboard main: teal tint + centered column).
 * Use inside {@link AppShell}; does not replace the shell or sidebar.
 */
export function AdminPageLayout({
  children,
  maxWidthClassName = "max-w-7xl",
}: {
  children: React.ReactNode;
  /** Tailwind max-width class for the inner column */
  maxWidthClassName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-teal-50/60">
      <div className={`mx-auto flex w-full flex-1 flex-col p-4 sm:p-6 ${maxWidthClassName}`}>{children}</div>
    </div>
  );
}
