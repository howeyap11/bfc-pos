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
  const [editSub, setEditSub] = useState<{ sub: Substitute; name: string } | null>(null);
  const [priceMatrix, setPriceMatrix] = useState<Record<string, Record<string, number>>>({}); // subId -> "sizeId_mode" -> cents
  const [recipeLinesBySub, setRecipeLinesBySub] = useState<Record<string, { ingredientId: string; qtyPerItem: number; unitCode: string }[]>>({});
  const [newRecipeBySub, setNewRecipeBySub] = useState<Record<string, { ingredientId: string; qty: string }>>({});
  const [savingPricesFor, setSavingPricesFor] = useState<string | null>(null);
  const [savingRecipeFor, setSavingRecipeFor] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    api
      .getSubstitutes()
      .then((list) => {
        setSubstitutes(list);
        const priceInit: Record<string, Record<string, number>> = {};
        const recipeInit: Record<string, { ingredientId: string; qtyPerItem: number; unitCode: string }[]> = {};
        for (const s of list) {
          priceInit[s.id] = {};
          for (const sz of sizes) {
            for (const mode of MODES) {
              const k = `${sz.id}_${mode}`;
              const p = (s.prices ?? []).find((pr: { sizeId: string; mode: string }) => pr.sizeId === sz.id && pr.mode === mode);
              priceInit[s.id][k] = (p as { priceCents?: number })?.priceCents ?? 0;
            }
          }
          recipeInit[s.id] = (s.recipeLines ?? []).map((r: { ingredientId: string; qtyPerItem: number | string; unitCode: string }) => ({
            ingredientId: r.ingredientId,
            qtyPerItem: typeof r.qtyPerItem === "string" ? parseFloat(r.qtyPerItem) || 0 : r.qtyPerItem,
            unitCode: r.unitCode,
          }));
        }
        setPriceMatrix((prev) => ({ ...prev, ...priceInit }));
        setRecipeLinesBySub((prev) => ({ ...prev, ...recipeInit }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

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

  useEffect(() => {
    if (sizes.length > 0 && substitutes.length > 0 && Object.keys(priceMatrix).length === 0) {
      const priceInit: Record<string, Record<string, number>> = {};
      for (const s of substitutes) {
        priceInit[s.id] = {};
        for (const sz of sizes) {
          for (const mode of MODES) {
            const k = `${sz.id}_${mode}`;
            const p = (s.prices ?? []).find((pr: { sizeId: string; mode: string }) => pr.sizeId === sz.id && pr.mode === mode);
            priceInit[s.id][k] = (p as { priceCents?: number })?.priceCents ?? 0;
          }
        }
      }
      setPriceMatrix(priceInit);
    }
  }, [sizes, substitutes]);

  function setPriceCell(subId: string, sizeId: string, mode: DrinkMode, cents: number) {
    setPriceMatrix((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] ?? {}), [`${sizeId}_${mode}`]: cents },
    }));
  }

  function getPriceCell(subId: string, sizeId: string, mode: DrinkMode): number {
    return priceMatrix[subId]?.[`${sizeId}_${mode}`] ?? 0;
  }

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
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
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

  async function savePrices(subId: string) {
    setSavingPricesFor(subId);
    setError("");
    try {
      const prices: { sizeId: string; mode: DrinkMode; priceCents: number }[] = [];
      for (const sz of sizes) {
        for (const mode of MODES) {
          const cents = getPriceCell(subId, sz.id, mode);
          if (cents > 0) prices.push({ sizeId: sz.id, mode, priceCents: cents });
        }
      }
      await api.putSubstitutePrices(subId, prices);
      setSuccess("Prices saved");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prices");
    } finally {
      setSavingPricesFor(null);
    }
  }

  function addRecipeLine(subId: string) {
    const st = newRecipeBySub[subId];
    if (!st?.ingredientId || !st.qty) return;
    const qty = parseFloat(st.qty);
    if (Number.isNaN(qty) || qty <= 0) return;
    const ing = ingredients.find((i) => i.id === st.ingredientId);
    setRecipeLinesBySub((prev) => ({
      ...prev,
      [subId]: [...(prev[subId] ?? []), { ingredientId: st.ingredientId, qtyPerItem: qty, unitCode: ing?.unitCode ?? "ml" }],
    }));
    setNewRecipeBySub((prev) => ({ ...prev, [subId]: { ingredientId: "", qty: "" } }));
  }

  function removeRecipeLine(subId: string, ingredientId: string) {
    setRecipeLinesBySub((prev) => ({
      ...prev,
      [subId]: (prev[subId] ?? []).filter((r) => r.ingredientId !== ingredientId),
    }));
  }

  async function saveRecipe(subId: string) {
    setSavingRecipeFor(subId);
    setError("");
    try {
      const lines = recipeLinesBySub[subId] ?? [];
      await api.putSubstituteRecipe(subId, lines);
      setSuccess("Recipe saved");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setSavingRecipeFor(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Milk Substitutes</h1>
      <p className="mb-6 text-sm text-gray-600">
        Define milk substitute types. Set price and recipe consumption by size/mode below. Assign substitutes to items in Create/Edit Item. Default milk is free.
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
        <div className="space-y-6">
          {substitutes.map((sub) => (
            <div
              key={sub.id}
              className={`rounded-lg border p-4 ${sub.isActive ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-gray-100 opacity-75"}`}
            >
              <div className="mb-4 flex items-center justify-between">
                {editSub?.sub.id === sub.id ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editSub.name}
                      onChange={(e) => setEditSub({ ...editSub, name: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm font-medium"
                      autoFocus
                    />
                    <button type="submit" disabled={saving || !editSub.name.trim()} className="rounded bg-teal-600 px-2 py-1 text-xs text-white disabled:opacity-50">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditSub(null)} className="text-gray-500 text-xs hover:underline">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{sub.name}</span>
                    {!sub.isActive && <span className="text-amber-600 text-sm">(inactive)</span>}
                    <button type="button" onClick={() => setEditSub({ sub, name: sub.name })} className="rounded border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100" title="Edit name">
                      Edit
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleToggleActive(sub)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">
                    {sub.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" onClick={() => handleDelete(sub)} className="text-red-600 text-sm hover:underline">
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-6 border-t border-gray-200 pt-4">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-gray-600">Price by size / mode (₱)</h4>
                  {sizes.filter((s) => s.isActive).length === 0 ? (
                    <p className="text-amber-600 text-sm">No sizes defined. Add sizes in Menu Settings → Sizes.</p>
                  ) : (
                    <div className="overflow-x-auto text-sm">
                      <table className="min-w-[300px] border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-gray-200 px-2 py-1 text-left font-medium">Size</th>
                            {MODES.map((m) => (
                              <th key={m} className="border border-gray-200 px-2 py-1 text-center font-medium">
                                {MODE_LABELS[m]}
                              </th>
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
                                    value={getPriceCell(sub.id, size.id, mode) / 100}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      setPriceCell(sub.id, size.id, mode, Number.isNaN(v) || v < 0 ? 0 : Math.round(v * 100));
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
                  )}
                  <button
                    type="button"
                    onClick={() => savePrices(sub.id)}
                    disabled={savingPricesFor === sub.id}
                    className="mt-2 rounded bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingPricesFor === sub.id ? "Saving…" : "Save prices"}
                  </button>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-gray-600">Recipe (ingredients)</h4>
                  <ul className="mb-2 space-y-1 text-sm">
                    {(recipeLinesBySub[sub.id] ?? (sub.recipeLines ?? []).map((r: { ingredientId: string; qtyPerItem: number | string; unitCode: string }) => ({
                      ingredientId: r.ingredientId,
                      qtyPerItem: typeof r.qtyPerItem === "string" ? parseFloat(r.qtyPerItem) || 0 : r.qtyPerItem,
                      unitCode: r.unitCode,
                    }))).map((r: { ingredientId: string; qtyPerItem: number; unitCode: string }) => (
                      <li key={r.ingredientId} className="flex items-center justify-between rounded bg-white px-2 py-1">
                        <span>{ingredients.find((i) => i.id === r.ingredientId)?.name ?? r.ingredientId}</span>
                        <span className="text-gray-500">{r.qtyPerItem} {r.unitCode}</span>
                        <button type="button" onClick={() => removeRecipeLine(sub.id, r.ingredientId)} className="text-red-500 hover:underline">
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[180px]">
                      <SearchableIngredientSelect
                        value={newRecipeBySub[sub.id]?.ingredientId ?? ""}
                        onChange={(id) => setNewRecipeBySub((prev) => ({ ...prev, [sub.id]: { ...(prev[sub.id] ?? { ingredientId: "", qty: "" }), ingredientId: id } }))}
                        ingredients={ingredients}
                        ingredientCategories={ingredientCategories}
                        excludeIds={(recipeLinesBySub[sub.id] ?? []).map((r) => r.ingredientId)}
                        placeholder="Add ingredient"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newRecipeBySub[sub.id]?.qty ?? ""}
                      onChange={(e) => setNewRecipeBySub((prev) => ({ ...prev, [sub.id]: { ...(prev[sub.id] ?? { ingredientId: "", qty: "" }), qty: e.target.value } }))}
                      placeholder="Qty"
                      className="w-20 rounded border px-2 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => addRecipeLine(sub.id)} disabled={!newRecipeBySub[sub.id]?.ingredientId || !newRecipeBySub[sub.id]?.qty} className="rounded bg-teal-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => saveRecipe(sub.id)}
                      disabled={savingRecipeFor === sub.id}
                      className="rounded border px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
                    >
                      {savingRecipeFor === sub.id ? "Saving…" : "Save recipe"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {substitutes.length === 0 && <p className="py-8 text-center text-gray-500">No milk substitutes yet. Add one above.</p>}
        </div>
      )}
    </div>
  );
}
