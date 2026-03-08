import { AppShell } from "@/components/AppShell";

export default function IngredientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
