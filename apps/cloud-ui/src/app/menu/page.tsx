"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  type Category,
  type SubCategory,
  type MenuItem,
  normalizeSubCategories,
} from "@/lib/api";
import { COLORS } from "@/lib/theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOAST_KEY = "items_toast";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

const TILE_COLORS = [
  { border: COLORS.primary, accent: COLORS.primary },
  { border: "#10b981", accent: "#10b981" },
  { border: "#f59e0b", accent: "#f59e0b" },
  { border: "#ef4444", accent: "#ef4444" },
  { border: "#8b5cf6", accent: "#8b5cf6" },
  { border: "#ec4899", accent: "#ec4899" },
];

function MenuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(searchParams.get("includeDeleted") === "1");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  const [addCategoryName, setAddCategoryName] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addSubName, setAddSubName] = useState("");
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategorySlug, setEditCategorySlug] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [saving, setSaving] = useState(false);

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [draggingSubCategoryId, setDraggingSubCategoryId] = useState<string | null>(null);
  const [dragOverSubCategoryId, setDragOverSubCategoryId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const currentCategory = safeCategories.find((c) => c.id === selectedCategoryId);
  const subcategories = currentCategory
    ? normalizeSubCategories(currentCategory.subCategories)
    : [];
  const selectedSubcategory = subcategories.find((s) => s.id === selectedSubCategoryId);
  const filteredItems =
    selectedSubCategoryId
      ? items
          .filter((i) => i.subCategoryId === selectedSubCategoryId)
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [];

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

  async function persistCategoryOrder(next: Category[]) {
    setCategories(next);
    try {
      await Promise.all(
        next.map((cat, index) =>
          cat.sortOrder !== index ? api.patchCategory(cat.id, { sortOrder: index }) : Promise.resolve(cat)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder categories");
      refresh();
    }
  }

  async function persistSubCategoryOrder(categoryId: string, nextSubs: SubCategory[]) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, subCategories: nextSubs } : cat
      )
    );
    try {
      await Promise.all(
        nextSubs.map((sub, index) =>
          sub.sortOrder !== index ? api.patchSubCategory(sub.id, { sortOrder: index }) : Promise.resolve(sub)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder subcategories");
      refresh();
    }
  }

  async function persistItemOrder(subCategoryId: string, nextItems: MenuItem[]) {
    setItems((prev) => {
      const other = prev.filter((i) => i.subCategoryId !== subCategoryId);
      return [...other, ...nextItems];
    });
    try {
      await Promise.all(
        nextItems.map((it, index) =>
          (it.sortOrder ?? 0) !== index
            ? api.updateItem(it.id, { sortOrder: index })
            : Promise.resolve(it)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder items");
      refresh();
    }
  }

  useEffect(() => {
    const msg = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(TOAST_KEY) : null;
    if (msg) {
      sessionStorage.removeItem(TOAST_KEY);
      setSuccess(msg);
      const t = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  function refresh() {
    setLoading(true);
    Promise.all([api.getCategories(), api.getItems(includeDeleted)])
      .then(([cats, its]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setItems(Array.isArray(its) ? its : []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setCategories([]);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  const includeDeletedParam = searchParams.get("includeDeleted") === "1";
  useEffect(() => {
    setIncludeDeleted(includeDeletedParam);
  }, [includeDeletedParam]);

  useEffect(() => {
    refresh();
  }, [includeDeleted]);

  useEffect(() => {
    if (safeCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(safeCategories[0]!.id);
    }
  }, [safeCategories.length, selectedCategoryId]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setSelectedSubCategoryId(null);
  }

  function selectSubcategory(id: string) {
    setSelectedSubCategoryId(id);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!addCategoryName.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.createCategory({
        name: addCategoryName.trim(),
        slug: slugFromName(addCategoryName),
      });
      setAddCategoryName("");
      setShowAddCategoryModal(false);
      setSuccess("Category added");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editCategoryId || !editCategoryName.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.patchCategory(editCategoryId, {
        name: editCategoryName.trim(),
        slug: editCategorySlug.trim() ? slugFromName(editCategorySlug) : undefined,
      });
      setEditCategoryId(null);
      setSuccess("Category updated");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategoryId || !addSubName.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.createSubCategoryByCategory(selectedCategoryId, { name: addSubName.trim() });
      setAddSubName("");
      setShowAddSubcategoryModal(false);
      setSuccess("Subcategory added");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editSubId || !editSubName.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.patchSubCategory(editSubId, { name: editSubName.trim() });
      setEditSubId(null);
      setSuccess("Subcategory updated");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteItem(item.id);
      setSuccess("Item deleted");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function handleRestoreItem(item: MenuItem) {
    if (!confirm(`Restore "${item.name}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.restoreItem(item.id);
      setSuccess("Item restored");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore");
    }
  }

  const inSubcategory = !!selectedSubCategoryId && !!selectedSubcategory;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: COLORS.bgDark }}>
        <span style={{ color: "#999" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col" style={{ background: COLORS.bgDark }}>
      {/* Top bar: Show deleted + actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
        style={{ background: COLORS.bgPanel, borderBottom: `1px solid ${COLORS.borderLight}` }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {success && <span className="text-sm text-green-400">{success}</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
          <label className="flex items-center gap-1.5 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                const v = e.target.checked;
                setIncludeDeleted(v);
                const url = new URL(window.location.href);
                url.pathname = "/menu";
                if (v) url.searchParams.set("includeDeleted", "1");
                else url.searchParams.delete("includeDeleted");
                router.replace(url.pathname + url.search, { scroll: false });
              }}
              className="rounded"
            />
            Show deleted
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inSubcategory ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditSubId(selectedSubcategory!.id);
                  setEditSubName(selectedSubcategory!.name);
                }}
                className="rounded px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10"
                style={{ border: `1px solid ${COLORS.borderLight}` }}
              >
                Edit Subcategory
              </button>
              <Link
                href={`/items/new?categoryId=${currentCategory?.id ?? ""}&subCategoryId=${selectedSubCategoryId}`}
                className="rounded px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: COLORS.primary }}
              >
                Create Item
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="rounded px-3 py-1.5 text-sm text-white"
                style={{ background: COLORS.primary }}
              >
                Add Category
              </button>
              <button
                type="button"
                disabled={!currentCategory}
                onClick={() => {
                  if (!currentCategory) return;
                  setShowAddSubcategoryModal(true);
                }}
                className="rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#10b981" }}
              >
                Add Subcategory
              </button>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditCategoryId(currentCategory.id);
                    setEditCategoryName(currentCategory.name);
                    setEditCategorySlug(currentCategory.slug);
                  }}
                  className="rounded px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10"
                  style={{ border: `1px solid ${COLORS.borderLight}` }}
                >
                  Edit Category
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main: CategoryRow + SubcategoryRow + ItemGrid */}
      <main className="flex-1 overflow-auto p-4">
        {!currentCategory ? (
          <p style={{ color: "#888" }}>Select a category above or add one.</p>
        ) : (
          <>
            {/* CategoryRow: horizontal scrollable chips */}
            <div className="mb-4 overflow-x-auto pb-2">
              <div className="flex gap-2" style={{ minWidth: "min-content" }}>
                {safeCategories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        background: selectedCategoryId === cat.id ? COLORS.primary : COLORS.bgPanel,
                        color: selectedCategoryId === cat.id ? "#000" : "#ddd",
                        border: `1px solid ${selectedCategoryId === cat.id ? COLORS.primary : COLORS.borderLight}`,
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Subcategory tiles (UTAK-style, like POS menu) */}
            {subcategories.length === 0 ? (
              <p style={{ color: "#888", marginBottom: 16 }}>
                No subcategories. Use &quot;Add Subcategory&quot; above.
              </p>
            ) : (
              <div
                className="mb-4 grid gap-4"
                style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 900 }}
              >
                {subcategories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((sub, index) => {
                    const colors = TILE_COLORS[index % TILE_COLORS.length];
                    const isSelected = selectedSubCategoryId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => selectSubcategory(sub.id)}
                        className="flex min-h-[100px] flex-col items-center justify-center rounded-lg p-4 transition-all"
                        style={{
                          background: isSelected ? "#333" : COLORS.bgPanel,
                          border: `2px solid ${colors.border}`,
                          transform: isSelected ? "translateY(-2px)" : "translateY(0)",
                        }}
                      >
                        <span
                          className="text-center text-sm font-bold uppercase tracking-wide text-white"
                          style={{ lineHeight: 1.3 }}
                        >
                          {sub.name}
                        </span>
                        <div
                          className="mt-2 h-0.5 w-10 rounded"
                          style={{ background: colors.accent }}
                        />
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Item grid under subcategories */}
            {inSubcategory && (
              <>
                <h3
                  className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "#ddd", borderColor: COLORS.primary }}
                >
                  {selectedSubcategory!.name}
                </h3>
                {filteredItems.length === 0 ? (
                  <p style={{ color: "#888", paddingTop: 24, textAlign: "center" }}>
                    No items. Use &quot;Create Item&quot; above.
                  </p>
                ) : (
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
                  >
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => {
                          setDraggingItemId(item.id);
                          setDragOverItemId(item.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (
                            draggingItemId &&
                            dragOverItemId !== item.id &&
                            selectedSubCategoryId
                          ) {
                            setDragOverItemId(item.id);
                            const ordered = filteredItems;
                            const next = reorderById(
                              ordered,
                              draggingItemId,
                              item.id
                            ).map((it, index) => ({ ...it, sortOrder: index }));
                            persistItemOrder(selectedSubCategoryId, next);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingItemId(null);
                          setDragOverItemId(null);
                        }}
                        className={`flex flex-col rounded-lg border-2 p-3 ${
                          dragOverItemId === item.id && draggingItemId
                            ? "ring-2 ring-amber-400"
                            : ""
                        }`}
                        style={{
                          background: COLORS.bgPanel,
                          borderColor: item.deletedAt ? "#444" : COLORS.borderLight,
                          opacity: item.deletedAt ? 0.75 : 1,
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={
                              item.imageUrl.startsWith("http")
                                ? item.imageUrl
                                : `${API_URL}${item.imageUrl}`
                            }
                            alt=""
                            className="mb-2 h-20 w-full rounded object-cover"
                          />
                        ) : (
                          <div
                            className="mb-2 flex h-20 w-full items-center justify-center rounded text-xs"
                            style={{ background: "#333", color: "#666" }}
                          >
                            No image
                          </div>
                        )}
                        <div className="font-semibold text-white text-sm">{item.name}</div>
                        <div className="text-sm font-semibold text-green-400">
                          {formatPesos(item.priceCents)}
                        </div>
                        {item.deletedAt && (
                          <span className="mt-1 text-xs text-red-400">Deleted</span>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Link
                            href={
                              item.deletedAt
                                ? `/items/${item.id}?includeDeleted=1`
                                : `/items/${item.id}`
                            }
                            className="text-xs text-amber-400 hover:underline"
                          >
                            Edit
                          </Link>
                          {item.deletedAt ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreItem(item)}
                              className="text-xs text-green-400 hover:underline"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {editCategoryId && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 font-semibold">Edit Category</h3>
            <form onSubmit={handleEditCategory} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">Name</label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Slug</label>
                <input
                  type="text"
                  value={editCategorySlug}
                  onChange={(e) => setEditCategorySlug(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditCategoryId(null)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editCategoryName.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 font-semibold">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">Name</label>
                <input
                  type="text"
                  value={addCategoryName}
                  onChange={(e) => setAddCategoryName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setAddCategoryName("");
                  }}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !addCategoryName.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSubcategoryModal && currentCategory && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 font-semibold">Add Subcategory</h3>
            <form onSubmit={handleAddSubcategory} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">Name</label>
                <input
                  type="text"
                  value={addSubName}
                  onChange={(e) => setAddSubName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubcategoryModal(false);
                    setAddSubName("");
                  }}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !addSubName.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSubId && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 font-semibold">Edit Subcategory</h3>
            <form onSubmit={handleEditSubcategory} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">Name</label>
                <input
                  type="text"
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSubId(null)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editSubName.trim()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-6">Loading…</div>}>
      <MenuPageContent />
    </Suspense>
  );
}
