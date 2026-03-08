"use client";

import { useEffect, useState } from "react";
import { api, type MenuOptionGroup, type MenuOption } from "@/lib/api";

export default function ModifiersPage() {
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
    </div>
  );
}
