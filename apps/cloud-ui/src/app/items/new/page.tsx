"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ItemForm from "@/components/ItemForm";

function buildMenuReturnUrl(categoryId: string, subCategoryId: string): string {
  if (!categoryId && !subCategoryId) return "/menu";
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (subCategoryId) params.set("subCategoryId", subCategoryId);
  return `/menu?${params.toString()}`;
}

function NewItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCategoryId = searchParams.get("categoryId") ?? "";
  const presetSubCategoryId = searchParams.get("subCategoryId") ?? "";
  const returnUrl = buildMenuReturnUrl(presetCategoryId, presetSubCategoryId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Link href={returnUrl} className="text-gray-500 hover:text-gray-700">
          ← Menu
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">New Item</h1>
      <ItemForm
        mode="create"
        presetCategoryId={presetCategoryId}
        presetSubCategoryId={presetSubCategoryId}
        onSuccess={() => router.replace(returnUrl)}
        onCancel={() => router.replace(returnUrl)}
      />
    </div>
  );
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-6">Loading…</div>}>
      <NewItemContent />
    </Suspense>
  );
}
