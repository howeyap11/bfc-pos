"use client";

import { useEffect, useState } from "react";
import { api, type Category, type SubCategory, normalizeSubCategories } from "@/lib/api";
import { SortableList, DragHandle } from "@/components/SortableList";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [subName, setSubName] = useState<Record<string, string>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .getCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed");
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreateNameChange(name: string) {
    setCreateName(name);
    setCreateSlug((prev) => (prev ? prev : slugFromName(name)));
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.createCategory({
        name: createName.trim(),
        slug: createSlug.trim() ? slugFromName(createSlug) || undefined : undefined,
      });
      setCreateName("");
      setCreateSlug("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setError("");
    try {
      await api.deleteCategory(cat.id);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      const body = (err as { body?: { error?: string } })?.body;
      if (body?.error === "CATEGORY_NOT_EMPTY") {
        setError("Cannot delete category while it still contains sub-categories. Delete or move the sub-categories first.");
      } else {
        setError(msg);
      }
    }
  }

  async function handleCreateSub(categoryId: string, e: React.FormEvent) {
    e.preventDefault();
    const name = subName[categoryId]?.trim();
    if (!name) return;
    setError("");
    setSaving(true);
    try {
      await api.createSubCategoryByCategory(categoryId, { name });
      setSubName((prev) => ({ ...prev, [categoryId]: "" }));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubCategory(sub: SubCategory) {
    if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
    setError("");
    try {
      await api.deleteSubCategory(sub.id);
      refresh();
    } catch (err: unknown) {
      const body = (err as { body?: { error?: string } })?.body;
      if (body?.error === "SUBCATEGORY_NOT_EMPTY") {
        setError("Cannot delete: subcategory has items. Delete or move them first.");
      } else {
        setError(err instanceof Error ? err.message : "Failed");
      }
    }
  }

  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Categories</h1>
      {error && <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</p>}

      <div className="mb-8 flex flex-wrap gap-6">
        <form onSubmit={handleCreateCategory} className="rounded border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium">Create Category</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={createName}
              onChange={(e) => handleCreateNameChange(e.target.value)}
              placeholder="Name"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              placeholder="slug (auto-generated)"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm w-40 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <SortableList
          items={safeCategories}
          setItems={setCategories}
          getId={(c) => c.id}
          onReorder={(order) => api.reorderCategories(order)}
          onSuccess={() => { setError(""); refresh(); }}
          onError={(msg) => setError(msg)}
          renderItem={({ item: cat, dragHandleProps, isDragging }) => {
            const subs = normalizeSubCategories(cat.subCategories);
            const isExpanded = expandedCat === cat.id;
            return (
              <div
                className={`rounded border bg-white shadow-sm ${isDragging ? "opacity-90 shadow-md" : ""}`}
              >
                <div className="flex items-center gap-2 p-3">
                  <DragHandle dragHandleProps={dragHandleProps} className="rounded border border-gray-200 p-1" />
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    className="font-medium text-left hover:text-blue-600"
                  >
                    {cat.name}
                  </button>
                  <span className="text-gray-500 text-sm">/{cat.slug}</span>
                  {subs.length > 0 && (
                    <span className="text-gray-500 text-sm">
                      ({subs.map((s) => s.name).join(", ")})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="ml-auto rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t px-3 pb-3 pt-2">
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Subcategories</h3>
                    <SortableList
                      items={subs}
                      setItems={(updater) => {
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.id === cat.id
                              ? { ...c, subCategories: typeof updater === "function" ? updater(c.subCategories ?? []) : updater }
                              : c
                          )
                        );
                      }}
                      getId={(s) => s.id}
                      onReorder={(order) => api.reorderSubCategories(order)}
                      onSuccess={() => { setError(""); refresh(); }}
                      onError={(msg) => setError(msg)}
                      listClassName="mb-3 space-y-1"
                      renderItem={({ item: sc, dragHandleProps }) => (
                        <div className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <DragHandle dragHandleProps={dragHandleProps} className="rounded p-0.5" />
                            <span>{sc.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubCategory(sc)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    />
                    <form onSubmit={(e) => handleCreateSub(cat.id, e)} className="flex gap-2">
                      <input
                        type="text"
                        value={subName[cat.id] ?? ""}
                        onChange={(e) => setSubName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="New subcategory name"
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                        Add subcategory
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          }}
        />
      )}
      {safeCategories.length === 0 && !loading && <p className="text-gray-500">No categories yet.</p>}
    </div>
  );
}
