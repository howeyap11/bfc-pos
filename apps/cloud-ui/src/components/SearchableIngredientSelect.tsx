"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Ingredient } from "@/lib/api";
import type { IngredientCategory } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DEPARTMENTS = ["BAR", "KITCHEN", "PASTRY", "SHARED"] as const;

function imgSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function IngredientThumb({ ingredient, size = 36 }: { ingredient: Ingredient; size?: number }) {
  const src = imgSrc(ingredient.imageUrl);
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
        </svg>
      )}
    </span>
  );
}

export function SearchableIngredientSelect({
  ingredients,
  ingredientCategories,
  value,
  onChange,
  excludeIds = [],
  placeholder = "Select ingredient",
  size = "default",
}: {
  ingredients: Ingredient[];
  ingredientCategories: IngredientCategory[];
  value: string;
  onChange: (ingredientId: string, ingredient: Ingredient) => void;
  excludeIds?: string[];
  placeholder?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredIngredients = useMemo(() => {
    let list = ingredients.filter((ing) => !excludeIds.includes(ing.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ing) => ing.name.toLowerCase().includes(q));
    }
    if (filterDept) {
      list = list.filter((ing) => (ing.department ?? "") === filterDept);
    }
    if (filterCategory) {
      list = list.filter((ing) => (ing.categoryId ?? "") === filterCategory);
    }
    return list;
  }, [ingredients, excludeIds, search, filterDept, filterCategory]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = ingredients.find((i) => i.id === value);

  const inputCls = size === "sm"
    ? "rounded border border-gray-300 px-2 py-1.5 text-sm"
    : "rounded border border-gray-300 px-3 py-2";

  return (
    <div ref={containerRef} className="relative w-full min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={selected?.name}
        className={`flex w-full min-w-[280px] sm:min-w-[360px] max-w-full items-center gap-2 text-left ${inputCls} bg-white`}
      >
        {selected ? (
          <>
            <IngredientThumb ingredient={selected} size={32} />
            <span className="min-w-0 flex-1 truncate" title={selected.name}>{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[360px] w-full max-w-[420px] overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterDept("")}
                className={`rounded px-2 py-1 text-xs ${!filterDept ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                All
              </button>
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDept(filterDept === d ? "" : d)}
                  className={`rounded px-2 py-1 text-xs ${filterDept === d ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            {ingredientCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setFilterCategory("")}
                  className={`rounded px-2 py-1 text-xs ${!filterCategory ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  All
                </button>
                {ingredientCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCategory(filterCategory === c.id ? "" : c.id)}
                    className={`rounded px-2 py-1 text-xs ${filterCategory === c.id ? "bg-gray-200 font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredIngredients.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">No ingredients match</div>
            ) : (
              filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  title={ing.name}
                  onClick={() => {
                    onChange(ing.id, ing);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <IngredientThumb ingredient={ing} size={36} />
                  <span className="min-w-0 flex-1 truncate" title={ing.name}>{ing.name}</span>
                  {ing.category?.name && (
                    <span className="shrink-0 text-xs text-gray-500">{ing.category.name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
