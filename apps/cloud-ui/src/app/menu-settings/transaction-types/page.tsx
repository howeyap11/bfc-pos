"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type TxType = {
  id: string;
  code: string;
  label: string;
  priceDeltaCents: number;
  isActive: boolean;
  sortOrder: number;
};

export default function TransactionTypesPage() {
  const [types, setTypes] = useState<TxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPriceDelta, setEditPriceDelta] = useState("");
  const [newLabel, setNewLabel] = useState("");

  function refresh() {
    setLoading(true);
    api
      .getTransactionTypes()
      .then(setTypes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(t: TxType) {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditPriceDelta((t.priceDeltaCents / 100).toFixed(2));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setEditPriceDelta("");
  }

  async function handleSave() {
    if (!editingId) return;
    const price = Math.round((parseFloat(editPriceDelta || "0") || 0) * 100);
    if (price < 0) {
      setError("Extra fee cannot be negative");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patchTransactionType(editingId, {
        label: editLabel.trim() || undefined,
        priceDeltaCents: price,
      });
      setSuccess("Saved");
      cancelEdit();
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(t: TxType) {
    setSaving(true);
    setError("");
    try {
      await api.patchTransactionType(t.id, { isActive: !t.isActive });
      setSuccess("Updated");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.createTransactionType({ label: newLabel.trim() });
      setSuccess("Added");
      setNewLabel("");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Transaction Types</h1>
      <p className="mb-6 text-sm text-gray-600">
        Global order-channel labels and extra fees. Apply to all items. Used for For Here, To Go, FoodPanda, GrabFood, BFC App, etc.
      </p>

      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Extra fee</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Active</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {types.map((t) => (
                  <tr key={t.id} className={!t.isActive ? "bg-gray-50 text-gray-500" : ""}>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium">{t.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={editPriceDelta}
                          onChange={(e) => setEditPriceDelta(e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span>{t.priceDeltaCents === 0 ? "—" : `+₱${(t.priceDeltaCents / 100).toFixed(2)}`}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(t)}
                        disabled={saving}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          t.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {t.isActive ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === t.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="text-sm text-teal-600 hover:underline"
                          >
                            Save
                          </button>
                          <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:underline">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startEdit(t)} className="text-sm text-teal-600 hover:underline">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Add transaction type</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. GrabFood, BFC App)"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={saving || !newLabel.trim()}
                className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
