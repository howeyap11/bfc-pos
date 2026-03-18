import { AuthGuard } from "@/components/AuthGuard";
import { DashboardNav } from "@/components/DashboardNav";

const SIDEBAR_WIDTH = 224; // w-56 = 14rem

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardNav />
      <main
        className="flex min-h-screen flex-col overflow-hidden bg-white"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </main>
    </AuthGuard>
  );
}
