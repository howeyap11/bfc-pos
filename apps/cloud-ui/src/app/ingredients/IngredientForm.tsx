"use client";

import { useState, useEffect } from "react";
import { api, type Ingredient, type IngredientCategory } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type IngredientFormProps = {
  mode: "create" | "edit";
  ingredient?: Ingredient | null;
  categories: IngredientCategory[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function IngredientForm({
  mode,
  ingredient = null,
  categories,
  onSuccess,
  onCancel,
}: IngredientFormProps) {
  const [name, setName] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("");
  const [hasSealedUnits, setHasSealedUnits] = useState(false);
  const [hasSealedBoxes, setHasSealedBoxes] = useState(false);
  const [sealedUnitAmount, setSealedUnitAmount] = useState(0);
  const [sealedBoxAmount, setSealedBoxAmount] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name);
      setUnitCode(ingredient.unitCode);
      setIsActive(ingredient.isActive);
      setCategoryId(ingredient.categoryId ?? ingredient.category?.id ?? "");
      setHasSealedUnits(ingredient.hasSealedUnits ?? false);
      setHasSealedBoxes(ingredient.hasSealedBoxes ?? false);
      setSealedUnitAmount(ingredient.sealedUnitAmount ?? 0);
      setSealedBoxAmount(ingredient.sealedBoxAmount ?? 0);
    } else {
      setCategoryId("");
      setHasSealedUnits(false);
      setHasSealedBoxes(false);
      setSealedUnitAmount(0);
      setSealedBoxAmount(0);
    }
  }, [ingredient]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name,
        unitCode,
        isActive,
        categoryId: categoryId.trim() || null,
        hasSealedUnits,
        hasSealedBoxes,
        sealedUnitAmount: Math.max(0, Math.floor(sealedUnitAmount)),
        sealedBoxAmount: Math.max(0, Math.floor(sealedBoxAmount)),
      };
      if (mode === "create") {
        const created = await api.createIngredient(payload);
        if (imageFile) await api.uploadIngredientImage(created.id, imageFile);
      } else if (ingredient) {
        await api.patchIngredient(ingredient.id, payload);
        if (imageFile) await api.uploadIngredientImage(ingredient.id, imageFile);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  const displayImage = imagePreview
    ? imagePreview
    : ingredient?.imageUrl
      ? ingredient.imageUrl.startsWith("http")
        ? ingredient.imageUrl
        : `${API_URL}${ingredient.imageUrl}`
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">{mode === "create" ? "New Ingredient" : "Edit Ingredient"}</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Image</label>
        <div className="flex items-center gap-3">
          {displayImage ? (
            <img src={displayImage} alt="" className="h-20 w-20 rounded border object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed bg-gray-50 text-xs text-gray-400">
              No image
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Unit code</label>
        <input
          type="text"
          value={unitCode}
          onChange={(e) => setUnitCode(e.target.value)}
          required
          placeholder="e.g. g, ml, unit"
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ingActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="ingActive" className="text-sm text-gray-700">Active</label>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        <p className="mb-2 text-sm font-medium text-gray-800">Staff count — sealed packaging (optional)</p>
        <p className="mb-3 text-xs text-gray-600">
          When enabled, POS staff enter <span className="font-mono text-gray-800">openedAmount</span>, plus sealed unit/box
          counts; <span className="font-mono text-gray-800">totalAmount</span> = opened + (sealedUnitCount × sealedUnitAmount) +
          (sealedBoxCount × sealedBoxAmount) in base UOM.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasSealedUnits}
              onChange={(e) => setHasSealedUnits(e.target.checked)}
              className="rounded border-gray-300"
            />
            hasSealedUnits
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasSealedBoxes}
              onChange={(e) => setHasSealedBoxes(e.target.checked)}
              className="rounded border-gray-300"
            />
            hasSealedBoxes
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm text-gray-700">
            sealedUnitAmount (base units per sealed unit)
            <input
              type="number"
              min={0}
              step={1}
              value={sealedUnitAmount}
              onChange={(e) => setSealedUnitAmount(parseInt(e.target.value, 10) || 0)}
              disabled={!hasSealedUnits}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 disabled:bg-gray-100"
            />
          </label>
          <label className="block text-sm text-gray-700">
            sealedBoxAmount (base units per box)
            <input
              type="number"
              min={0}
              step={1}
              value={sealedBoxAmount}
              onChange={(e) => setSealedBoxAmount(parseInt(e.target.value, 10) || 0)}
              disabled={!hasSealedBoxes}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 disabled:bg-gray-100"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
