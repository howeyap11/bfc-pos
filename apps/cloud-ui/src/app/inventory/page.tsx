"use client";

import { useEffect, useState } from "react";
import { api, type InventoryStockRow, type InventoryLocation } from "@/lib/api";
import { isCloudAdminRole } from "@/lib/cloudAdminRole";
import { canUseDangerousDevTools } from "@/lib/devMode";

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
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [devIngredientId, setDevIngredientId] = useState("");
  const [devLocationId, setDevLocationId] = useState("");
  const [devQty, setDevQty] = useState("");
  const [devBusy, setDevBusy] = useState(false);
  const [devMsg, setDevMsg] = useState("");

  const showDevManualSet = isCloudAdminRole() && canUseDangerousDevTools();

  function refresh() {
    setLoading(true);
    Promise.all([api.getInventoryStock(), api.getInventoryLocations()])
      .then(([stock, locs]) => {
        setRows(stock);
        setLocations(locs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submitDevSet(e: React.FormEvent) {
    e.preventDefault();
    setDevMsg("");
    const q = Number(devQty);
    if (!devIngredientId || !devLocationId || Number.isNaN(q)) {
      setDevMsg("Choose ingredient, location, and a numeric quantity.");
      return;
    }
    setDevBusy(true);
    try {
      const res = await api.devManualSetInventoryStock({
        ingredientId: devIngredientId,
        locationId: devLocationId,
        quantityBase: q,
      });
      setDevMsg(res.skipped ? `Already at ${res.current}.` : "Stock correction applied.");
      refresh();
    } catch (err) {
      setDevMsg(err instanceof Error ? err.message : "Request failed");
    } finally {
      setDevBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Inventory</h1>
      <p className="mb-4 text-sm text-gray-600">
        Current stock counts computed from the stock movements ledger. No reconciliation or pull-outs.
      </p>

      {showDevManualSet && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <h2 className="mb-2 font-semibold text-amber-900">Dev: manual stock correction</h2>
          <p className="mb-3 text-amber-800/90">
            Sets on-hand quantity via a single ledger adjustment. Does not change sales, refunds, or accounting. Disabled in
            production on the API.
          </p>
          <form onSubmit={submitDevSet} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-700">Ingredient</span>
              <select
                value={devIngredientId}
                onChange={(e) => setDevIngredientId(e.target.value)}
                className="min-w-[200px] rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {rows.map((r) => (
                  <option key={r.ingredientId} value={r.ingredientId}>
                    {r.ingredientName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-700">Location</span>
              <select
                value={devLocationId}
                onChange={(e) => setDevLocationId(e.target.value)}
                className="min-w-[160px] rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-700">Target quantity</span>
              <input
                type="number"
                step="any"
                value={devQty}
                onChange={(e) => setDevQty(e.target.value)}
                className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={devBusy}
              className="rounded bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {devBusy ? "Applying…" : "Apply correction"}
            </button>
          </form>
          {devMsg && <p className="mt-2 text-gray-800">{devMsg}</p>}
        </div>
      )}

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
