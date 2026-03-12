import { Suspense } from "react";
import { DashboardContent } from "./DashboardContent";

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100/90">
      <div className="text-gray-500">Loading dashboard...</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
