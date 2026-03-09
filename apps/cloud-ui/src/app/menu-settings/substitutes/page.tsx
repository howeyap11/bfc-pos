"use client";

import { useEffect, useState } from "react";
import { api, type Substitute, type Ingredient, type IngredientCategory } from "@/lib/api";
import { SearchableIngredientSelect } from "@/components/SearchableIngredientSelect";

export default function SubstitutesPage() {
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [recipeModalId, setRecipeModalId] = useState<string | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; qtyPerItem: number; unitCode: string }[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");

  function refresh() {
    setLoading(true);
    api
      .getSubstitutes()
      .then(setSubstitutes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
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
      const priceCents = Math.round((parseFloat(newPrice) || 0) * 100);
      await api.createSubstitute({ name: newName.trim(), priceCents });
      setNewName("");
      setNewPrice("");
      setSuccess("Substitute created");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const priceCents = Math.round((parseFloat(editPrice) || 0) * 100);
      await api.patchSubstitute(editId, { name: editName.trim(), priceCents, isActive: editActive });
      setEditId(null);
      setSuccess("Substitute updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sub: Substitute) {
    if (!confirm(`Delete substitute "${sub.name}"?`)) return;
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
    setRecipeModalId(sub.id);
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
    if (!recipeModalId) return;
    setRecipeSaving(true);
    setError("");
    try {
      await api.putSubstituteRecipe(recipeModalId, recipeLines);
      setRecipeModalId(null);
      setSuccess("Recipe saved");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setRecipeSaving(false);
    }
  }

  function addRecipeLine() {
    if (!newIngredientId || !newQty) return;
    const qty = parseFloat(newQty);
    if (Number.isNaN(qty) || qty <= 0) return;
    const ing = ingredients.find((i) => i.id === newIngredientId);
    const unitCode = ing?.unitCode ?? "oz";
    setRecipeLines((prev) => [...prev, { ingredientId: newIngredientId, qtyPerItem: qty, unitCode }]);
    setNewIngredientId("");
    setNewQty("");
  }

  function removeRecipeLine(ingredientId: string) {
    setRecipeLines((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Substitutes</h1>
      <p className="mb-6 text-sm text-gray-600">
        Milk substitutes (oat, soy, almond, etc.) with prices and recipe consumption. Assign to items in Create/Edit Item. When substitutes are enabled, a default milk is required.
      </p>

      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Add Substitute</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Oat Milk, Soy Milk"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price (₱)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0"
              className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {substitutes.map((sub) => (
            <div key={sub.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              {editId === sub.id ? (
                <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                    Active
                  </label>
                  <button type="submit" disabled={saving} className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="text-gray-500 hover:underline">
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-gray-900">{sub.name}</span>
                    <span className="ml-2 text-gray-500">₱{((sub.priceCents ?? 0) / 100).toFixed(2)}</span>
                    {!sub.isActive && <span className="ml-2 text-amber-600">(inactive)</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openRecipe(sub)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Recipe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(sub.id);
                        setEditName(sub.name);
                        setEditPrice(((sub.priceCents ?? 0) / 100).toFixed(2));
                        setEditActive(sub.isActive ?? true);
                      }}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(sub)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {substitutes.length === 0 && <p className="py-8 text-center text-gray-500">No substitutes yet. Add one above.</p>}
        </div>
      )}

      {recipeModalId && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 font-semibold">Recipe (ingredient consumption)</h3>
            <div className="mb-4 flex gap-2">
              <div className="flex-1">
                <SearchableIngredientSelect
                  value={newIngredientId}
                  onChange={(id) => setNewIngredientId(id)}
                  ingredients={ingredients}
                  ingredientCategories={ingredientCategories}
                  excludeIds={recipeLines.map((r) => r.ingredientId)}
                  placeholder="Add ingredient"
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="Qty"
                className="w-20 rounded border px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addRecipeLine}
                disabled={!newIngredientId || !newQty}
                className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <ul className="mb-4 space-y-1 text-sm">
              {recipeLines.map((r) => (
                <li key={r.ingredientId} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
                  <span>{ingredients.find((i) => i.id === r.ingredientId)?.name ?? r.ingredientId}</span>
                  <span>{r.qtyPerItem} {r.unitCode}</span>
                  <button type="button" onClick={() => removeRecipeLine(r.ingredientId)} className="text-red-500">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecipeModalId(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRecipe}
                disabled={recipeSaving}
                className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {recipeSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
