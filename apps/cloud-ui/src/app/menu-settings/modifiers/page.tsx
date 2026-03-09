"use client";

import { useEffect, useState } from "react";
import { api, type MenuOptionGroup, type MenuOption } from "@/lib/api";
import { SearchableIngredientSelect } from "@/components/SearchableIngredientSelect";
import type { Ingredient, IngredientCategory } from "@/lib/api";

export default function ModifiersPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [groups, setGroups] = useState<MenuOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newOptionName, setNewOptionName] = useState<Record<string, string>>({});
  const [newOptionDelta, setNewOptionDelta] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .getModifierGroups()
      .then(setGroups)
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

  const [recipeModal, setRecipeModal] = useState<{ groupId: string; optionId: string; optionName: string } | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; qtyPerItem: number; unitCode: string }[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.createOptionGroup({
        name: newSectionName.trim(),
        isSizeGroup: false,
      });
      setNewSectionName("");
      setSuccess("Modifier section created");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetRequired(g: MenuOptionGroup, required: boolean) {
    setError("");
    setSuccess("");
    try {
      await api.patchOptionGroup(g.id, { required });
      setSuccess("Updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleSetTrackRecipe(g: MenuOptionGroup, trackRecipeConsumption: boolean) {
    setError("");
    setSuccess("");
    try {
      await api.patchOptionGroup(g.id, { trackRecipeConsumption });
      setSuccess("Updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function openRecipeModal(groupId: string, option: MenuOption) {
    setRecipeModal({ groupId, optionId: option.id, optionName: option.name });
    const lines = (option as MenuOption & { recipeLines?: { ingredientId: string; qtyPerItem: number | string; unitCode: string }[] }).recipeLines ?? [];
    setRecipeLines(lines.map((r) => ({
      ingredientId: r.ingredientId,
      qtyPerItem: typeof r.qtyPerItem === "string" ? parseFloat(r.qtyPerItem) || 0 : r.qtyPerItem,
      unitCode: r.unitCode,
    })));
    setNewIngredientId("");
    setNewQty("");
  }

  async function saveOptionRecipe() {
    if (!recipeModal) return;
    setRecipeSaving(true);
    setError("");
    try {
      await api.putOptionRecipe(recipeModal.groupId, recipeModal.optionId, recipeLines);
      setRecipeModal(null);
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

  async function handleSetDefaultOption(g: MenuOptionGroup, defaultOptionId: string | null) {
    setError("");
    setSuccess("");
    try {
      await api.patchOptionGroup(g.id, { defaultOptionId });
      setSuccess("Updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleAddOption(e: React.FormEvent, groupId: string) {
    e.preventDefault();
    const name = (newOptionName[groupId] ?? "").trim();
    if (!name) return;
    const raw = newOptionDelta[groupId] ?? "";
    const delta = raw === "" ? 0 : Math.round((parseFloat(raw) || 0) * 100);
    setSaving(true);
    setError("");
    try {
      await api.addOption(groupId, { name, priceDelta: delta });
      setNewOptionName((prev) => ({ ...prev, [groupId]: "" }));
      setNewOptionDelta((prev) => ({ ...prev, [groupId]: "" }));
      setSuccess("Option added");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOption(groupId: string, optionId: string) {
    setError("");
    try {
      await api.deleteOption(groupId, optionId);
      setSuccess("Option removed");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDeleteSection(g: MenuOptionGroup) {
    if (!confirm(`Delete modifier section "${g.name}"? Items using it will lose this modifier.`)) return;
    setError("");
    try {
      await api.deleteOptionGroup(g.id);
      setSuccess("Section deleted");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Modifiers</h1>
      <p className="mb-6 text-sm text-gray-600">
        Reusable modifier sections (Ice, Sweetness, Roast Type, etc.). Assign them to items in Create/Edit Item.
      </p>

      {success && <p className="mb-3 text-green-600 text-sm">{success}</p>}
      {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleCreateSection} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-gray-700">Add Modifier Section</label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Ice, Sweetness Level, Roast Type"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newSectionName.trim()}
            className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Add Modifier Set
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <span>Required</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!g.required}
                      onClick={() => handleSetRequired(g, !g.required)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                        g.required ? "bg-teal-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          g.required ? "translate-x-4" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <span>Track recipe</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!g.trackRecipeConsumption}
                      onClick={() => handleSetTrackRecipe(g, !g.trackRecipeConsumption)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                        g.trackRecipeConsumption ? "bg-teal-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          g.trackRecipeConsumption ? "translate-x-4" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Default</span>
                    <select
                      value={g.defaultOptionId ?? ""}
                      onChange={(e) => handleSetDefaultOption(g, e.target.value || null)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                      disabled={(g.options ?? []).length === 0}
                    >
                      <option value="">—</option>
                      {(g.options ?? []).map((o: MenuOption) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </label>
                  {g.isDeletable !== false && !g.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(g)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <ul className="mb-4 space-y-2">
                {(g.options ?? []).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <div className="flex items-center gap-2">
                      {g.trackRecipeConsumption && (
                        <button
                          type="button"
                          onClick={() => openRecipeModal(g.id, o)}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
                        >
                          Recipe
                        </button>
                      )}
                      <span className="text-gray-500">
                        ₱{((o.priceDelta ?? 0) / 100).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(g.id, o.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => handleAddOption(e, g.id)}
                className="flex flex-wrap gap-2"
              >
                <input
                  type="text"
                  value={newOptionName[g.id] ?? ""}
                  onChange={(e) =>
                    setNewOptionName((prev) => ({ ...prev, [g.id]: e.target.value }))
                  }
                  placeholder="Option name"
                  className="flex-1 min-w-[100px] rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newOptionDelta[g.id] ?? ""}
                  onChange={(e) =>
                    setNewOptionDelta((prev) => ({ ...prev, [g.id]: e.target.value }))
                  }
                  placeholder="Δ"
                  className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Add option
                </button>
              </form>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="col-span-2 py-8 text-center text-gray-500">
              No modifier sections yet. Add one above.
            </p>
          )}
        </div>
      )}

      {recipeModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 font-semibold">Recipe for {recipeModal.optionName}</h3>
            <p className="mb-4 text-xs text-gray-500">Ingredient consumption when this choice is selected.</p>
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
                onClick={() => setRecipeModal(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveOptionRecipe}
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
