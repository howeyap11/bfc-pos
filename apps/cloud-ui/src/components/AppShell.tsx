import { AuthGuard } from "@/components/AuthGuard";
import { DashboardNav } from "@/components/DashboardNav";

const SIDEBAR_WIDTH = 224; // w-56 = 14rem

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardNav />
      <main
        className="min-h-screen overflow-y-auto bg-white"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        {children}
      </main>
    </AuthGuard>
  );
}
