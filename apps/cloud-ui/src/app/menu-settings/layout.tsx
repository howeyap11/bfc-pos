import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MenuSettingsNav } from "./MenuSettingsNav";

export default function MenuSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="px-4">
        <MenuSettingsNav />
        {children}
      </div>
    </AppShell>
  );
}
