"use client";

import { useEffect, useState } from "react";
import { api, type InventoryStockRow } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function imageSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function refresh() {
    setLoading(true);
    api
      .getInventoryStock()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Inventory</h1>
      <p className="mb-4 text-sm text-gray-600">
        Current stock counts computed from the stock movements ledger. No reconciliation or pull-outs.
      </p>
      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-14 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">Image</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Ingredient</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Store Stock</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Warehouse Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Last Movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.ingredientId} className="hover:bg-gray-50">
                  <td className="px-2 py-3">
                    {imageSrc(r.imageUrl) ? (
                      <img
                        src={imageSrc(r.imageUrl)!}
                        alt=""
                        className="h-10 w-10 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed bg-gray-50 text-xs text-gray-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.ingredientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">{r.storeStock}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">{r.warehouseStock}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.unitCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.lastMovementAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-6 text-center text-gray-500">No inventory data.</p>
          )}
        </div>
      )}
    </div>
  );
}
