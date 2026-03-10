"use client";

import { useEffect, useState } from "react";
import { api, type Substitute, type MenuSize, type Ingredient, type IngredientCategory } from "@/lib/api";
import { SearchableIngredientSelect } from "@/components/SearchableIngredientSelect";

type DrinkMode = "ICED" | "HOT" | "CONCENTRATED";
const MODES: DrinkMode[] = ["ICED", "HOT", "CONCENTRATED"];
const MODE_LABELS: Record<DrinkMode, string> = { ICED: "Iced", HOT: "Hot", CONCENTRATED: "Concentrated" };

export default function SubstitutesPage() {
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [sizes, setSizes] = useState<MenuSize[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState<{ sub: Substitute; name: string } | null>(null);
  const [recipeModal, setRecipeModal] = useState<Substitute | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; qtyPerItem: number; unitCode: string }[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [priceModal, setPriceModal] = useState<Substitute | null>(null);
  const [priceMatrix, setPriceMatrix] = useState<Record<string, number>>({}); // key: sizeId_mode
  const [priceSaving, setPriceSaving] = useState(false);

  function refresh() {
    setLoading(true);
    api.getSubstitutes()
      .then(setSubstitutes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    api.getMenuSizes().then((r) => setSizes(r.sizes ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    Promise.all([api.getIngredients(), api.getIngredientCategories()])
      .then(([ings, cats]) => {
        setIngredients(ings ?? []);
        setIngredientCategories(cats ?? []);
      })
      .catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.createSubstitute({ name: newName.trim() });
      setNewName("");
      setSuccess("Milk substitute created");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function handleUpdateName(e: React.FormEvent) {
    if (!editSub) return;
    e.preventDefault();
    const name = editSub.name.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      await api.patchSubstitute(editSub.sub.id, { name });
      setEditSub(null);
      setSuccess("Name updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally { setSaving(false); }
  }

  async function handleToggleActive(sub: Substitute) {
    setSaving(true);
    setError("");
    try {
      await api.patchSubstitute(sub.id, { isActive: !sub.isActive });
      setSuccess(sub.isActive ? "Deactivated" : "Activated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function handleDelete(sub: Substitute) {
    if (!confirm(`Delete "${sub.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await api.deleteSubstitute(sub.id);
      setSuccess("Substitute deleted");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  function openRecipe(sub: Substitute) {
    setRecipeModal(sub);
    setRecipeLines(
      (sub.recipeLines ?? []).map((r) => ({
        ingredientId: r.ingredientId,
        qtyPerItem: typeof r.qtyPerItem === "string" ? parseFloat(r.qtyPerItem) || 0 : r.qtyPerItem,
        unitCode: r.unitCode,
      }))
    );
    setNewIngredientId("");
    setNewQty("");
  }

  async function saveRecipe() {
    if (!recipeModal) return;
    setRecipeSaving(true);
    setError("");
    try {
      await api.putSubstituteRecipe(recipeModal.id, recipeLines);
      setRecipeModal(null);
      setSuccess("Recipe saved");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally { setRecipeSaving(false); }
  }

  function addRecipeLine() {
    if (!newIngredientId || !newQty) return;
    const qty = parseFloat(newQty);
    if (Number.isNaN(qty) || qty <= 0) return;
    const ing = ingredients.find((i) => i.id === newIngredientId);
    setRecipeLines((prev) => [...prev, { ingredientId: newIngredientId, qtyPerItem: qty, unitCode: ing?.unitCode ?? "oz" }]);
    setNewIngredientId("");
    setNewQty("");
  }

  function openPricing(sub: Substitute) {
    setPriceModal(sub);
    const matrix: Record<string, number> = {};
    for (const size of sizes) {
      for (const mode of MODES) {
        const k = `${size.id}_${mode}`;
        const existing = (sub.prices ?? []).find((pr) => pr.sizeId === size.id && pr.mode === mode);
        matrix[k] = existing?.priceCents ?? 0;
      }
    }
    setPriceMatrix(matrix);
  }

  function setPriceCell(sizeId: string, mode: DrinkMode, cents: number) {
    setPriceMatrix((prev) => ({ ...prev, [`${sizeId}_${mode}`]: cents }));
  }

  function getPriceCell(sizeId: string, mode: DrinkMode): number {
    return priceMatrix[`${sizeId}_${mode}`] ?? 0;
  }

  async function savePricing() {
    if (!priceModal) return;
    setPriceSaving(true);
    setError("");
    try {
      const prices: { sizeId: string; mode: DrinkMode; priceCents: number }[] = [];
      for (const size of sizes) {
        for (const mode of MODES) {
          const cents = getPriceCell(size.id, mode);
          if (cents > 0) {
            prices.push({ sizeId: size.id, mode, priceCents: cents });
          }
        }
      }
      await api.putSubstitutePrices(priceModal.id, prices);
      setPriceModal(null);
      setSuccess("Pricing saved");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing");
    } finally { setPriceSaving(false); }
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Milk Substitutes</h1>
      <p className="mb-6 text-sm text-gray-600">
        Define milk substitute types and set prices by size and temperature. Default milk is free. Assign substitutes to items in Create/Edit Item.
      </p>

      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Add milk type</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Oat Milk, Soy Milk"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={saving || !newName.trim()} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            Add
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {substitutes.map((sub) => (
            <div key={sub.id} className={`rounded-lg border p-4 ${sub.isActive ? "border-gray-200 bg-gray-50" : "border-gray-150 bg-gray-100 opacity-75"}`}>
              <div className="flex items-center justify-between">
                {editSub?.sub.id === sub.id ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editSub.name}
                      onChange={(e) => setEditSub({ ...editSub, name: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm font-medium"
                      autoFocus
                    />
                    <button type="submit" disabled={saving || !editSub.name.trim()} className="rounded bg-teal-600 px-2 py-1 text-xs text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => setEditSub(null)} className="text-gray-500 text-xs hover:underline">Cancel</button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)} className="text-left">
                      <span className="font-medium text-gray-900">{sub.name}</span>
                      {!sub.isActive && <span className="ml-2 text-amber-600 text-sm">(inactive)</span>}
                    </button>
                    <button type="button" onClick={() => setEditSub({ sub, name: sub.name })} className="rounded border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100" title="Edit name">Edit</button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleToggleActive(sub)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">
                    {sub.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" onClick={() => openRecipe(sub)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">Recipe</button>
                  <button type="button" onClick={() => openPricing(sub)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">Pricing</button>
                  <button type="button" onClick={() => handleDelete(sub)} className="text-red-600 text-sm hover:underline">Delete</button>
                </div>
              </div>
              {expandedId === sub.id && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="mb-2 text-sm text-gray-600">Price entries: {(sub.prices ?? []).length}</p>
                  {sub.prices && sub.prices.length > 0 && (
                    <div className="overflow-x-auto text-sm">
                      <table className="min-w-[200px]">
                        <thead>
                          <tr>
                            <th className="text-left font-medium">Size</th>
                            <th className="text-left font-medium">Mode</th>
                            <th className="text-right font-medium">Price (₱)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sub.prices.map((p) => (
                            <tr key={`${p.sizeId}-${p.mode}`}>
                              <td>{(p as { size?: { label: string } }).size?.label ?? p.sizeId}</td>
                              <td>{MODE_LABELS[p.mode as DrinkMode] ?? p.mode}</td>
                              <td className="text-right">{(p.priceCents / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {substitutes.length === 0 && <p className="py-8 text-center text-gray-500">No milk substitutes yet. Add one above.</p>}
        </div>
      )}

      {recipeModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 font-semibold">Recipe: {recipeModal.name}</h3>
            <div className="mb-4 flex gap-2">
              <div className="flex-1">
                <SearchableIngredientSelect value={newIngredientId} onChange={(id) => setNewIngredientId(id)} ingredients={ingredients} ingredientCategories={ingredientCategories} excludeIds={recipeLines.map((r) => r.ingredientId)} placeholder="Add ingredient" />
              </div>
              <input type="number" step="0.01" min="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Qty" className="w-20 rounded border px-2 py-1.5 text-sm" />
              <button type="button" onClick={addRecipeLine} disabled={!newIngredientId || !newQty} className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">Add</button>
            </div>
            <ul className="mb-4 space-y-1 text-sm">
              {recipeLines.map((r) => (
                <li key={r.ingredientId} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
                  <span>{ingredients.find((i) => i.id === r.ingredientId)?.name ?? r.ingredientId}</span>
                  <span>{r.qtyPerItem} {r.unitCode}</span>
                  <button type="button" onClick={() => setRecipeLines((prev) => prev.filter((x) => x.ingredientId !== r.ingredientId))} className="text-red-500">×</button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRecipeModal(null)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
              <button type="button" onClick={saveRecipe} disabled={recipeSaving} className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{recipeSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {priceModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 font-semibold">Pricing: {priceModal.name}</h3>
            <p className="mb-4 text-sm text-gray-600">Set prices by size and temperature. Leave blank or 0 for free. Default milk is always free.</p>
            <div className="overflow-x-auto text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-200 px-2 py-1 text-left font-medium">Size</th>
                    {MODES.map((m) => (
                      <th key={m} className="border border-gray-200 px-2 py-1 text-center font-medium">{MODE_LABELS[m]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.filter((s) => s.isActive).map((size) => (
                    <tr key={size.id}>
                      <td className="border border-gray-200 px-2 py-1 font-medium">{size.label}</td>
                      {MODES.map((mode) => (
                        <td key={mode} className="border border-gray-200 px-2 py-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getPriceCell(size.id, mode) / 100}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setPriceCell(size.id, mode, Number.isNaN(v) || v < 0 ? 0 : Math.round(v * 100));
                            }}
                            className="w-full rounded border px-2 py-0.5"
                            placeholder="0"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sizes.filter((s) => s.isActive).length === 0 && <p className="py-4 text-amber-600 text-sm">No sizes defined. Add sizes in Menu Settings &gt; Sizes first.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPriceModal(null)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
              <button type="button" onClick={savePricing} disabled={priceSaving} className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{priceSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
