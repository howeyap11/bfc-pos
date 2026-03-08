"use client";

import { useEffect } from "react";

export default function TableBinder({ tableId }: { tableId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("bfc_table_id", tableId);
    } catch {
      // ignore
    }
  }, [tableId]);

  return null;
}
