"use client";

import { useEffect, useState } from "react";
import { api, type MenuOptionGroup, type MenuOption } from "@/lib/api";

export default function OptionsPage() {
  const [groups, setGroups] = useState<MenuOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionDelta, setNewOptionDelta] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .getOptionGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      await api.createOptionGroup({ name: newGroupName.trim() });
      setNewGroupName("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddOption(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !newOptionName.trim()) return;
    const delta = parseFloat(newOptionDelta);
    setSaving(true);
    try {
      await api.addOption(selectedGroupId, {
        name: newOptionName.trim(),
        priceDelta: Number.isNaN(delta) ? 0 : Math.round(delta * 100),
      });
      setNewOptionName("");
      setNewOptionDelta("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(g: MenuOptionGroup) {
    if (!confirm(`Delete option group "${g.name}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteOptionGroup(g.id);
      setSuccess("Group deleted");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const body = (err as { body?: { message?: string } })?.body;
      const msg = body?.message ?? (err instanceof Error ? err.message : "Failed to delete");
      setError(msg);
      console.error("[deleteGroup] failed:", { groupId: g.id, error: err });
    }
  }

  async function deleteOption(groupId: string, optionId: string) {
    setError("");
    setSuccess("");
    try {
      await api.deleteOption(groupId, optionId);
      setSuccess("Option removed");
      refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      setError(msg);
      console.error("[deleteOption] failed:", { groupId, optionId, error: err });
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const displayGroups = groups.filter((g) => g.name !== "Sizes");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Option Groups</h1>
      {success && <p className="mb-3 text-green-600 text-sm">{success}</p>}
      {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}

      <div className="mb-8 flex flex-wrap gap-6">
        <form onSubmit={handleCreateGroup} className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Create Group</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Milk, Temperature, Add-ons..."
              className="rounded border px-2 py-1.5 text-sm"
            />
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
        <form onSubmit={handleAddOption} className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Add Option</h2>
          <div className="flex gap-2">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Group</option>
              {displayGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              placeholder="Option name"
              className="rounded border px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={newOptionDelta}
              onChange={(e) => setNewOptionDelta(e.target.value)}
              placeholder="Δ ₱"
              className="rounded border px-2 py-1.5 text-sm w-20"
            />
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {displayGroups.map((g) => (
            <div key={g.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{g.name}</h3>
                {g.isDeletable !== false && !g.isSystem ? (
                  <button
                    type="button"
                    onClick={() => deleteGroup(g)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete group
                  </button>
                ) : (
                  <span className="text-amber-600 text-xs">(locked)</span>
                )}
              </div>
              <p className="text-gray-500 text-sm mb-2">
                {g.required ? "Required" : "Optional"} · {g.multi ? "Multi-select" : "Single"}
              </p>
              {(g.sections ?? []).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {(g.sections ?? []).map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
              <ul className="space-y-1">
                {(g.options ?? []).map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-sm">
                    <span>{o.name}</span>
                    <span className="text-gray-500">
                      {o.priceDelta !== 0
                        ? (o.priceDelta >= 0 ? "+" : "") + "₱" + (o.priceDelta / 100).toFixed(2)
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteOption(g.id, o.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {(g.options ?? []).length === 0 && <li className="text-gray-500 text-sm">No options</li>}
              </ul>
            </div>
          ))}
          {displayGroups.length === 0 && <p className="text-gray-500">No option groups yet. Sizes are managed under Menu Settings → Sizes.</p>}
        </div>
      )}
    </div>
  );
}
