import { AppShell } from "@/components/AppShell";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
