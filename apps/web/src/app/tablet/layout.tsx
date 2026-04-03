import PosErrorBoundary from "../pos/pos-error-boundary";
import HealthGate from "../pos/health-gate";
import TabletShell from "./tablet-shell";

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return (
    <PosErrorBoundary>
      <HealthGate>
        <TabletShell>{children}</TabletShell>
      </HealthGate>
    </PosErrorBoundary>
  );
}
