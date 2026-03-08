"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ItemForm from "@/components/ItemForm";

export default function NewItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCategoryId = searchParams.get("categoryId") ?? "";
  const presetSubCategoryId = searchParams.get("subCategoryId") ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Link href="/menu" className="text-gray-500 hover:text-gray-700">
          ← Menu
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">New Item</h1>
      <ItemForm
        mode="create"
        presetCategoryId={presetCategoryId}
        presetSubCategoryId={presetSubCategoryId}
        onSuccess={() => router.replace("/menu")}
        onCancel={() => router.back()}
      />
    </div>
  );
}
