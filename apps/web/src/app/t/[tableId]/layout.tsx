import type { ReactNode } from "react";
import TableBinder from "./table-binder";

export default async function TableLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;

  return (
    <>
      <TableBinder tableId={tableId} />
      {children}
    </>
  );
}
