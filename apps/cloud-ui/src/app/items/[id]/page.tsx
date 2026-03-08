"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type MenuItem } from "@/lib/api";
import ItemForm from "@/components/ItemForm";

const TOAST_KEY = "items_toast";

function EditItemContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const includeDeleted = searchParams.get("includeDeleted") === "1";
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getItem(id, includeDeleted)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, includeDeleted]);

  async function handleDelete() {
    if (!confirm(`Delete item "${item?.name}"?`)) return;
    try {
      await api.deleteItem(id);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TOAST_KEY, "Item deleted");
      router.replace("/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleRestore() {
    if (!confirm(`Restore item "${item?.name}"?`)) return;
    try {
      await api.restoreItem(id);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TOAST_KEY, "Item restored");
      router.replace("/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    }
  }

  function handleSuccess() {
    api.getItem(id).then(setItem);
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6">Loading…</div>;
  if (error && !item) return <div className="mx-auto max-w-6xl px-4 py-6 text-red-600">{error}</div>;
  if (!item) return null;

  if (item.deletedAt) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Link href="/menu?includeDeleted=1" className="text-gray-500 hover:text-gray-700">
            ← Menu
          </Link>
        </div>
        <div className="rounded border border-amber-200 bg-amber-50 p-6">
          <h1 className="mb-2 text-xl font-semibold text-amber-800">Item deleted</h1>
          <p className="mb-4 text-amber-700">
            {item.name} has been deleted. Restore it to make it visible again.
          </p>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestore}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Restore item
            </button>
            <Link
              href="/menu?includeDeleted=1"
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/menu" className="text-gray-500 hover:text-gray-700">
          ← Menu
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Edit Item</h1>
      <ItemForm
        mode="edit"
        itemId={id}
        existingItem={item}
        onSuccess={handleSuccess}
        showDelete
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function EditItemPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-6">Loading…</div>}>
      <EditItemContent />
    </Suspense>
  );
}
