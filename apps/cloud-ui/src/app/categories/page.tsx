"use client";

import { useEffect, useState } from "react";
import { api, type Category, type SubCategory, normalizeSubCategories } from "@/lib/api";

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
        setError("Cannot delete: category has subcategories. Delete or move them first.");
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

  async function reorderCategory(cat: Category, direction: "up" | "down") {
    const idx = safeCategories.indexOf(cat);
    if (idx < 0) return;
    const next = direction === "up" ? idx - 1 : idx + 1;
    if (next < 0 || next >= safeCategories.length) return;
    const target = safeCategories[next];
    setError("");
    try {
      await api.patchCategory(cat.id, { sortOrder: target.sortOrder });
      await api.patchCategory(target.id, { sortOrder: cat.sortOrder });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

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
        <ul className="space-y-2">
          {safeCategories.map((cat, idx) => {
            const subs = normalizeSubCategories(cat.subCategories);
            const isExpanded = expandedCat === cat.id;
            return (
              <li key={cat.id} className="rounded border bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => reorderCategory(cat, "up")}
                      disabled={idx === 0}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderCategory(cat, "down")}
                      disabled={idx === safeCategories.length - 1}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
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
                  <div className="mt-4 border-t pt-4">
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Subcategories</h3>
                    <ul className="mb-3 space-y-1">
                      {subs.map((sc) => (
                        <li key={sc.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
                          {sc.name}
                          <button
                            type="button"
                            onClick={() => handleDeleteSubCategory(sc)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
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
              </li>
            );
          })}
          {safeCategories.length === 0 && <p className="text-gray-500">No categories yet.</p>}
        </ul>
      )}
    </div>
  );
}
