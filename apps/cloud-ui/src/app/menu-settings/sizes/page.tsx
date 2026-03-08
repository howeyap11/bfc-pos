"use client";

import { useEffect, useState } from "react";
import { api, type MenuSize, type MenuSizeVariant } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function sizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

const DRINK_MODES = [
  { key: "ICED" as const, label: "Iced" },
  { key: "HOT" as const, label: "Hot" },
  { key: "CONCENTRATED" as const, label: "Concentrated" },
];

export default function SizesPage() {
  const [sizes, setSizes] = useState<MenuSize[]>([]);
  const [variants, setVariants] = useState<MenuSizeVariant[]>([]);
  const [availability, setAvailability] = useState<{
    ICED: string[];
    HOT: string[];
    CONCENTRATED: string[];
  }>({
    ICED: [],
    HOT: [],
    CONCENTRATED: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingAvailability, setPendingAvailability] = useState<{
    ICED: string[];
    HOT: string[];
    CONCENTRATED: string[];
  }>({
    ICED: [],
    HOT: [],
    CONCENTRATED: [],
  });

  function refresh() {
    setLoading(true);
    api
      .getMenuSizes()
      .then((r) => {
        setSizes(r.sizes ?? []);
        setVariants(r.variants ?? []);
        if (r.availability) {
          const next = {
            ICED: r.availability.ICED ?? [],
            HOT: r.availability.HOT ?? [],
            CONCENTRATED: r.availability.CONCENTRATED ?? [],
          };
          setAvailability(next);
          setPendingAvailability(next);
        } else {
          const empty = {
            ICED: [],
            HOT: [],
            CONCENTRATED: [],
          };
          setAvailability(empty);
          setPendingAvailability(empty);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setSizes([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setError("");
    setSaving(true);
    try {
      await api.createMenuSize({
        label: newLabel.trim(),
        sortOrder: sizes.length,
      });
      setNewLabel("");
      setSuccess("Size added");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(size: MenuSize) {
    setEditingId(size.id);
    setEditLabel(size.label);
    setEditSortOrder(String(size.sortOrder));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setEditSortOrder("");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const sortOrder = parseInt(editSortOrder, 10);
    setError("");
    setSaving(true);
    try {
      await api.patchMenuSize(editingId, {
        label: editLabel.trim(),
        sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      });
      setSuccess("Size updated");
      setEditingId(null);
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleVariantImageUpload(variantId: string, file: File) {
    setError("");
    setSaving(true);
    try {
      await api.uploadMenuSizeVariantImage(variantId, file);
      setSuccess("Image updated");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(size: MenuSize) {
    if (!confirm(`Disable size "${size.label}"?`)) return;
    setError("");
    setSaving(true);
    try {
      await api.deleteMenuSize(size.id);
      setSuccess("Size disabled");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnable(size: MenuSize) {
    setError("");
    setSaving(true);
    try {
      await api.patchMenuSize(size.id, { isActive: true });
      setSuccess("Size enabled");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable");
    } finally {
      setSaving(false);
    }
  }

  const activeSizes = sizes.filter((s) => s.isActive);

  function toggleAvailability(mode: "ICED" | "HOT" | "CONCENTRATED", sizeId: string) {
    setPendingAvailability((prev) => {
      const current = prev[mode] ?? [];
      const exists = current.includes(sizeId);
      const nextForMode = exists ? current.filter((id) => id !== sizeId) : [...current, sizeId];
      return {
        ...prev,
        [mode]: nextForMode,
      };
    });
  }

  async function handleSaveAvailability() {
    setError("");
    setSaving(true);
    try {
      await api.updateMenuSizeAvailability({ availability: pendingAvailability });
      setSuccess("Mode availability updated");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Sizes</h1>
      {success && <p className="mb-3 text-green-600 text-sm">{success}</p>}
      {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}

      {/* Drink size definitions: per-mode availability from Menu Settings */}
      <div className="mb-6 rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <h2 className="text-sm font-semibold text-gray-700">Drink size definitions</h2>
          <p className="mt-1 text-xs text-gray-500">
            These modes and sizes are the global definitions from Menu Settings. Enable sizes per item when editing each item.
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {DRINK_MODES.map((m) => (
            <div key={m.key} className="px-4 py-4">
              <h3 className="mb-2 text-sm font-medium text-gray-800">{m.label}</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const idsForMode = availability[m.key] ?? [];
                  const sizesForMode = activeSizes.filter((s) => idsForMode.includes(s.id));
                  if (sizesForMode.length === 0) {
                    return <p className="text-gray-500 text-sm">No sizes configured for this mode.</p>;
                  }
                  return sizesForMode.map((s) => {
                    const v = variants.find((v) => v.mode === m.key && v.sizeId === s.id);
                    const imgUrl = sizeImageUrl(v?.imageUrl);
                    return (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-gray-400 text-xs">—</span>
                        )}
                        {s.label}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin control: MenuSizeAvailability */}
      <div className="mb-6 rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <h2 className="text-sm font-semibold text-gray-700">Mode availability</h2>
          <p className="mt-1 text-xs text-gray-500">
            Choose which sizes are available for each mode. Items can only enable sizes that are allowed here.
          </p>
        </div>
        <div className="px-4 py-4 space-y-4">
          {DRINK_MODES.map((m) => (
            <div key={m.key}>
              <h3 className="mb-2 text-sm font-medium text-gray-800">{m.label}</h3>
              {activeSizes.length === 0 ? (
                <p className="text-gray-500 text-sm">No active sizes. Add sizes below.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {activeSizes.map((s) => {
                    const checked = pendingAvailability[m.key]?.includes(s.id) ?? false;
                    const v = variants.find((v) => v.mode === m.key && v.sizeId === s.id);
                    const imgUrl = sizeImageUrl(v?.imageUrl);
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAvailability(m.key, s.id)}
                            className="rounded border-gray-300"
                          />
                          <span>{s.label}</span>
                        </label>
                        {checked && (
                          <div className="flex items-center gap-2 ml-2">
                            {imgUrl ? (
                              <img src={imgUrl} alt="" className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-400 text-xs">—</span>
                            )}
                            <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                              {imgUrl ? "Change" : "Add"} image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f && v) handleVariantImageUpload(v.id, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleSaveAvailability}
            disabled={saving}
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save availability"}
          </button>
        </div>
      </div>

      {/* Add new size */}
      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New size (e.g. 20oz)"
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={saving || !newLabel.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Master list of sizes */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
            All sizes
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Label</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Sort</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sizes.map((s) => (
                <tr
                  key={s.id}
                  className={s.isActive ? "" : "bg-gray-50 opacity-75"}
                >
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-32"
                      />
                    ) : (
                      <span className="font-medium">{s.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <input
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-16"
                      />
                    ) : (
                      <span className="text-gray-600">{s.sortOrder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.isActive
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : "rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600"
                      }
                    >
                      {s.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === s.id ? (
                      <span className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-gray-600 hover:underline text-sm"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        {s.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDisable(s)}
                            disabled={saving}
                            className="text-red-600 hover:underline text-sm disabled:opacity-50"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEnable(s)}
                            disabled={saving}
                            className="text-green-600 hover:underline text-sm disabled:opacity-50"
                          >
                            Enable
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sizes.length === 0 && (
            <p className="px-4 py-8 text-center text-gray-500">No sizes. Run db:seed or add above.</p>
          )}
        </div>
      )}
    </div>
  );
}
