"use client";

import { useEffect, useState } from "react";
import { api, type InventoryStockRow, type InventoryLocation } from "@/lib/api";
import { isCloudAdminRole } from "@/lib/cloudAdminRole";
import { canUseDangerousDevTools } from "@/lib/devMode";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import { InventoryManualCountReporting } from "@/components/InventoryManualCountReporting";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function imageSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function addedClass(n: number): string {
  return n > 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-gray-400";
}

function wasteOrPullClass(n: number): string {
  return n > 0 ? "tabular-nums text-red-600" : "tabular-nums text-gray-400";
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
    <AdminPageLayout maxWidthClassName="max-w-7xl">
      <h1 className="mb-1 text-2xl font-semibold text-teal-950">Inventory</h1>
      <p className="mb-6 text-sm text-teal-900/70">
        Store and warehouse on-hand are ledger totals from synced movements. <span className="font-medium text-emerald-800">Added</span>{" "}
        columns aggregate purchase/transfer-in/manual adds; <span className="font-medium text-red-700">waste</span> and{" "}
        <span className="font-medium text-red-700">pulled out</span> match synced operational data (no live recomputation from
        sales here).
      </p>

      <InventoryManualCountReporting />

      {showDevManualSet && (
        <div className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 text-sm shadow-sm ring-1 ring-amber-100">
          <h2 className="mb-2 font-semibold text-amber-950">Dev: manual stock correction</h2>
          <p className="mb-3 text-amber-950/80">
            Sets on-hand quantity via a single ledger adjustment. Does not change sales, refunds, or accounting. Disabled in
            production on the API.
          </p>
          <form onSubmit={submitDevSet} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-teal-900/80">Ingredient</span>
              <select
                value={devIngredientId}
                onChange={(e) => setDevIngredientId(e.target.value)}
                className="min-w-[200px] rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm text-teal-950"
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
              <span className="text-xs font-medium text-teal-900/80">Location</span>
              <select
                value={devLocationId}
                onChange={(e) => setDevLocationId(e.target.value)}
                className="min-w-[160px] rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm text-teal-950"
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
              <span className="text-xs font-medium text-teal-900/80">Target quantity</span>
              <input
                type="number"
                step="any"
                value={devQty}
                onChange={(e) => setDevQty(e.target.value)}
                className="w-28 rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm text-teal-950"
              />
            </label>
            <button
              type="submit"
              disabled={devBusy}
              className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {devBusy ? "Applying…" : "Apply correction"}
            </button>
          </form>
          {devMsg && <p className="mt-2 text-amber-950">{devMsg}</p>}
        </div>
      )}

      {loading && <p className="text-teal-800/70">Loading…</p>}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-teal-100/80 bg-white shadow-sm ring-1 ring-black/5">
          <table className="min-w-full divide-y divide-teal-100/80">
            <thead className="bg-teal-50/80">
              <tr>
                <th className="w-14 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Image
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Ingredient
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-teal-800/70">Unit</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Store stock
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-emerald-800/90">Store added</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-red-700/90">Waste</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-teal-800/70">
                  Warehouse stock
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-emerald-800/90">Warehouse added</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-red-700/90">Pulled out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50">
              {rows.map((r) => (
                <tr key={r.ingredientId} className="hover:bg-teal-50/40">
                  <td className="px-2 py-3">
                    {imageSrc(r.imageUrl) ? (
                      <img
                        src={imageSrc(r.imageUrl)!}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-teal-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-teal-200/80 text-xs text-teal-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-teal-950">{r.ingredientName}</td>
                  <td className="px-3 py-3 text-sm text-teal-900/70">{r.categoryName ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-teal-900/70">{r.unitCode}</td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums text-teal-950">{formatQty(r.storeStock)}</td>
                  <td className={`px-3 py-3 text-right text-sm ${addedClass(r.storeAdded ?? 0)}`}>
                    {formatQty(r.storeAdded ?? 0)}
                  </td>
                  <td className={`px-3 py-3 text-right text-sm ${wasteOrPullClass(r.waste ?? 0)}`}>
                    {formatQty(r.waste ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums text-teal-950">{formatQty(r.warehouseStock)}</td>
                  <td className={`px-3 py-3 text-right text-sm ${addedClass(r.warehouseAdded ?? 0)}`}>
                    {formatQty(r.warehouseAdded ?? 0)}
                  </td>
                  <td className={`px-3 py-3 text-right text-sm ${wasteOrPullClass(r.pulledOut ?? 0)}`}>
                    {formatQty(r.pulledOut ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-teal-800/65">No inventory data.</p>}
        </div>
      )}
    </AdminPageLayout>
  );
}
