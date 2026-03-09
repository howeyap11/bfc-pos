"use client";

import { useEffect, useState } from "react";
import { api, type SubstituteGroup, type SubstituteOption, type Ingredient, type IngredientCategory } from "@/lib/api";
import { SearchableIngredientSelect } from "@/components/SearchableIngredientSelect";

export default function SubstitutesPage() {
  const [groups, setGroups] = useState<SubstituteGroup[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [newOptionGroupId, setNewOptionGroupId] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("");
  const [editOption, setEditOption] = useState<{ groupId: string; option: SubstituteOption } | null>(null);
  const [editOptionName, setEditOptionName] = useState("");
  const [editOptionPrice, setEditOptionPrice] = useState("");
  const [editOptionActive, setEditOptionActive] = useState(true);
  const [recipeModal, setRecipeModal] = useState<{ groupId: string; option: SubstituteOption } | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; qtyPerItem: number; unitCode: string }[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");

  function refresh() {
    setLoading(true);
    api.getSubstituteGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    Promise.all([api.getIngredients(), api.getIngredientCategories()])
      .then(([ings, cats]) => {
        setIngredients(ings ?? []);
        setIngredientCategories(cats ?? []);
      })
      .catch(() => {});
  }, []);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.createSubstituteGroup({ name: newGroupName.trim() });
      setNewGroupName("");
      setSuccess("Substitute group created");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function handleDeleteGroup(g: SubstituteGroup) {
    if (!confirm(`Delete substitute group "${g.name}"?`)) return;
    setError("");
    try {
      await api.deleteSubstituteGroup(g.id);
      setSuccess("Group deleted");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  async function handleCreateOption(groupId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newOptionName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const priceCents = Math.round((parseFloat(newOptionPrice) || 0) * 100);
      await api.createSubstituteOption(groupId, { name: newOptionName.trim(), priceCents });
      setNewOptionGroupId(null);
      setNewOptionName("");
      setNewOptionPrice("");
      setSuccess("Option added");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function handleUpdateOption(e: React.FormEvent) {
    if (!editOption) return;
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const priceCents = Math.round((parseFloat(editOptionPrice) || 0) * 100);
      await api.patchSubstituteOption(editOption.groupId, editOption.option.id, { name: editOptionName.trim(), priceCents, isActive: editOptionActive });
      setEditOption(null);
      setSuccess("Option updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function handleDeleteOption(groupId: string, opt: SubstituteOption) {
    if (!confirm(`Delete option "${opt.name}"?`)) return;
    setError("");
    try {
      await api.deleteSubstituteOption(groupId, opt.id);
      setSuccess("Option deleted");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  function openRecipe(groupId: string, option: SubstituteOption) {
    setRecipeModal({ groupId, option });
    setRecipeLines(
      (option.recipeLines ?? []).map((r) => ({
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
      await api.putSubstituteOptionRecipe(recipeModal.groupId, recipeModal.option.id, recipeLines);
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

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Substitute Groups</h1>
      <p className="mb-6 text-sm text-gray-600">
        Group milk substitutes (e.g. Milk Options). Assign groups to items in Create/Edit Item. When substitutes are enabled, default milk is required.
      </p>

      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleCreateGroup} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Add Group</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Milk Options"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={saving || !newGroupName.trim()} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">Add Group</button>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)} className="flex items-center gap-2 text-left">
                  <span className="font-medium text-gray-900">{g.name}</span>
                  <span className="text-gray-500 text-sm">({(g.options ?? []).length} options)</span>
                </button>
                <button type="button" onClick={() => handleDeleteGroup(g)} className="text-red-600 hover:underline text-sm">Delete Group</button>
              </div>
              {expandedGroupId === g.id && (
                <div className="mt-4 pl-2 border-l-2 border-gray-300 space-y-3">
                  {(g.options ?? []).map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between rounded bg-white p-2">
                      {editOption?.option.id === opt.id ? (
                        <form onSubmit={handleUpdateOption} className="flex gap-2 items-center">
                          <input value={editOptionName} onChange={(e) => setEditOptionName(e.target.value)} className="rounded border px-2 py-1 text-sm" />
                          <input type="number" step="0.01" value={editOptionPrice} onChange={(e) => setEditOptionPrice(e.target.value)} className="w-20 rounded border px-2 py-1 text-sm" />
                          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={editOptionActive} onChange={(e) => setEditOptionActive(e.target.checked)} /> Active</label>
                          <button type="submit" className="rounded bg-teal-600 px-2 py-1 text-xs text-white">Save</button>
                          <button type="button" onClick={() => setEditOption(null)} className="text-gray-500 text-xs">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <div>
                            <span className="font-medium">{opt.name}</span>
                            <span className="ml-2 text-gray-500">₱{((opt.priceCents ?? 0) / 100).toFixed(2)}</span>
                            {!opt.isActive && <span className="ml-2 text-amber-600 text-xs">(inactive)</span>}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openRecipe(g.id, opt)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">Recipe</button>
                            <button type="button" onClick={() => { setEditOption({ groupId: g.id, option: opt }); setEditOptionName(opt.name); setEditOptionPrice(((opt.priceCents ?? 0) / 100).toFixed(2)); setEditOptionActive(opt.isActive ?? true); }} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">Edit</button>
                            <button type="button" onClick={() => handleDeleteOption(g.id, opt)} className="text-red-600 text-xs hover:underline">Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {newOptionGroupId === g.id ? (
                    <form onSubmit={(e) => handleCreateOption(g.id, e)} className="flex gap-2 items-center">
                      <input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} placeholder="Option name" className="rounded border px-2 py-1 text-sm flex-1" />
                      <input type="number" step="0.01" value={newOptionPrice} onChange={(e) => setNewOptionPrice(e.target.value)} placeholder="₱" className="w-20 rounded border px-2 py-1 text-sm" />
                      <button type="submit" disabled={saving || !newOptionName.trim()} className="rounded bg-teal-600 px-2 py-1 text-xs text-white">Add</button>
                      <button type="button" onClick={() => { setNewOptionGroupId(null); setNewOptionName(""); setNewOptionPrice(""); }} className="text-gray-500 text-xs">Cancel</button>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setNewOptionGroupId(g.id)} className="text-teal-600 text-sm hover:underline">+ Add option</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && <p className="py-8 text-center text-gray-500">No substitute groups yet. Add one above.</p>}
        </div>
      )}

      {recipeModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 font-semibold">Recipe: {recipeModal.option.name}</h3>
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
    </div>
  );
}
