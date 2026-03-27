import { AppShell } from "@/components/AppShell";
import { SettingsAccessGate } from "@/components/SettingsAccessGate";
import { SettingsNav } from "./SettingsNav";
import { COLORS } from "@/lib/theme";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <SettingsAccessGate>
        <div
          className="flex min-h-screen flex-1 p-6"
          style={{ background: COLORS.bgDark, color: "#ddd" }}
        >
          <SettingsNav />
          <main className="flex-1">{children}</main>
        </div>
      </SettingsAccessGate>
    </AppShell>
  );
}
