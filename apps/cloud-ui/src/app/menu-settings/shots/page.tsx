"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ShotRule = {
  id: string;
  name: string;
  shotsPerBundle: number;
  priceCentsPerBundle: number;
  isActive: boolean;
};

export default function ShotsPage() {
  const [rules, setRules] = useState<ShotRule[]>([]);
  const [activeRule, setActiveRule] = useState<ShotRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShotsPerBundle, setEditShotsPerBundle] = useState("");
  const [editPriceCentsPerBundle, setEditPriceCentsPerBundle] = useState("");

  function refresh() {
    setLoading(true);
    api.getShotPricingRules().then((r) => {
      setRules(r.rules ?? []);
      setActiveRule(r.activeRule ?? null);
    }).catch((e) => setError(e instanceof Error ? e.message : "Failed to load")).finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(rule: ShotRule) {
    setEditingId(rule.id);
    setEditShotsPerBundle(String(rule.shotsPerBundle));
    setEditPriceCentsPerBundle(String((rule.priceCentsPerBundle / 100).toFixed(2)));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditShotsPerBundle("");
    setEditPriceCentsPerBundle("");
  }

  async function handleSave() {
    if (!editingId) return;
    const shots = parseInt(editShotsPerBundle, 10);
    const price = Math.round(parseFloat(editPriceCentsPerBundle || "0") * 100);
    if (Number.isNaN(shots) || shots < 1 || Number.isNaN(price) || price < 0) {
      setError("Invalid values");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patchShotPricingRule(editingId, { shotsPerBundle: shots, priceCentsPerBundle: price });
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

  async function handleCreateDefault() {
    setSaving(true);
    setError("");
    try {
      await api.createShotPricingRule({
        name: "Standard",
        shotsPerBundle: 2,
        priceCentsPerBundle: 4000,
        isActive: true,
      });
      setSuccess("Rule created");
      refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const preview = activeRule ? `₱${(activeRule.priceCentsPerBundle / 100).toFixed(0)} per ${activeRule.shotsPerBundle} shots` : null;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-2xl font-semibold">Shots</h1>
      <p className="mb-6 text-sm text-gray-600">
        Global extra-shot pricing. Default shots on items are free; extra shots beyond the default are charged using this rule.
      </p>
      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          {activeRule ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Active rule</h2>
              {editingId === activeRule.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Shots per bundle</label>
                    <input
                      type="number"
                      min={1}
                      value={editShotsPerBundle}
                      onChange={(e) => setEditShotsPerBundle(e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Price per bundle (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editPriceCentsPerBundle}
                      onChange={(e) => setEditPriceCentsPerBundle(e.target.value)}
                      className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-semibold text-teal-700">{preview}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Charge = ceil(extraShots ÷ {activeRule.shotsPerBundle}) × ₱{(activeRule.priceCentsPerBundle / 100).toFixed(0)}
                  </p>
                  <button type="button" onClick={() => startEdit(activeRule)} className="mt-2 text-sm text-teal-600 hover:underline">
                    Edit
                  </button>
                </>
              )}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="mb-3 text-sm text-gray-600">No shot pricing rule yet.</p>
              <button
                type="button"
                onClick={handleCreateDefault}
                disabled={saving}
                className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Create default rule (₱40 per 2 shots)
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active rule. Edit a rule to activate it.</p>
          )}
        </div>
      )}
    </div>
  );
}
