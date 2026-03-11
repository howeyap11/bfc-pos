"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api, type Ingredient, type IngredientCategory } from "@/lib/api";
import { IngredientForm } from "./IngredientForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const DEPARTMENTS = ["BAR", "KITCHEN", "PASTRY", "SHARED"] as const;

function reorderById<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((x) => x.id === fromId);
  const toIndex = list.findIndex((x) => x.id === toId);
  if (fromIndex === -1 || toIndex === -1) return list;
  const result = list.slice();
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [dragFromId, setDragFromId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<Ingredient[] | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([api.getIngredients(), api.getIngredientCategories()])
      .then(([ings, cats]) => {
        setIngredients(ings);
        setCategories(cats);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openCreate() {
    setEditIngredient(null);
    setModalMode("create");
  }

  function openEdit(ing: Ingredient) {
    setEditIngredient(ing);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditIngredient(null);
  }

  function applyReorder(fromId: string, toId: string) {
    setLocalOrder((prev) => reorderById(prev ?? ingredients, fromId, toId));
  }

  async function persistReorder() {
    const list = localOrder ?? ingredients;
    const order = list.map((ing, idx) => ({ id: ing.id, sortOrder: idx }));
    try {
      await api.reorderIngredients(order);
      setIngredients(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
      refresh();
    } finally {
      setLocalOrder(null);
    }
  }

  function categoryName(ing: Ingredient): string {
    return ing.category?.name ?? "—";
  }

  const filteredIngredients = useMemo(() => {
    let list = localOrder ?? ingredients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ing) => ing.name.toLowerCase().includes(q));
    }
    if (filterDept) {
      list = list.filter((ing) => (ing.department ?? "") === filterDept);
    }
    if (filterCategory) {
      list = list.filter((ing) => (ing.categoryId ?? "") === filterCategory);
    }
    return list;
  }, [ingredients, localOrder, search, filterDept, filterCategory]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ingredients</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Categories
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Ingredient
          </button>
        </div>
      </div>
      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="min-w-[200px] rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterDept("")}
                className={`rounded px-2 py-1 text-xs ${!filterDept ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                All Depts
              </button>
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDept(filterDept === d ? "" : d)}
                  className={`rounded px-2 py-1 text-xs ${filterDept === d ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setFilterCategory("")}
                  className={`rounded px-2 py-1 text-xs ${!filterCategory ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCategory(filterCategory === c.id ? "" : c.id)}
                    className={`rounded px-2 py-1 text-xs ${filterCategory === c.id ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-2 py-2" />
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Image</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Base Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Active</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIngredients.map((ing) => (
                <tr
                  key={ing.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragFromId && dragFromId !== ing.id) {
                      setDragOverId(ing.id);
                      applyReorder(dragFromId, ing.id);
                    }
                  }}
                  className={`hover:bg-gray-50 ${dragOverId === ing.id ? "ring-1 ring-amber-400" : ""}`}
                >
                  <td
                    draggable
                    onDragStart={() => {
                      setDragFromId(ing.id);
                      setDragOverId(ing.id);
                      setLocalOrder(ingredients);
                    }}
                    onDragEnd={() => {
                      if (dragFromId && localOrder) {
                        persistReorder();
                      }
                      setDragFromId(null);
                      setDragOverId(null);
                      setLocalOrder(null);
                    }}
                    className="cursor-grab px-2 py-3 text-gray-400"
                    title="Drag to reorder"
                  >
                    <span className="text-lg">⋮⋮</span>
                  </td>
                  <td className="px-4 py-3">
                    {ing.imageUrl ? (
                      <img
                        src={ing.imageUrl.startsWith("http") ? ing.imageUrl : `${API_URL}${ing.imageUrl}`}
                        alt=""
                        className="h-10 w-10 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed bg-gray-50 text-xs text-gray-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ing.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{categoryName(ing)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ing.unitCode}</td>
                  <td className="px-4 py-3 text-sm">{ing.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(ing)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredIngredients.length === 0 && (
            <p className="px-4 py-6 text-center text-gray-500">
              {ingredients.length === 0 ? "No ingredients yet." : "No ingredients match your filters."}
            </p>
          )}
        </div>
        </>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
            <IngredientForm
              mode={modalMode}
              ingredient={editIngredient}
              categories={categories}
              onSuccess={() => {
                closeModal();
                refresh();
              }}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}

      {categoriesOpen && (
        <CategoriesModal
          categories={categories}
          onClose={() => setCategoriesOpen(false)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}

function CategoriesModal({
  categories,
  onClose,
  onUpdate,
}: {
  categories: IngredientCategory[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);
    try {
      await api.createIngredientCategory({ name: name.trim() });
      setName("");
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      await api.deleteIngredientCategory(id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Manage Categories</h2>
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
            >
              <span className="text-sm">{c.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                disabled={deletingId === c.id}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {categories.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">No categories yet.</p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
