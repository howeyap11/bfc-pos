"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  api,
  type Category,
  type Ingredient,
  type IngredientCategory,
  type MenuItem,
  type MenuSize,
  type DrinkSizesResponse,
  type DrinkMode,
  type DrinkSizesByModePayload,
  type MenuItemSizePrice,
  type RecipeLineSize,
  type AddOnGroup,
  type Substitute,
  normalizeCategoriesResponse,
  normalizeSubCategories,
} from "@/lib/api";
import { SearchableIngredientSelect } from "@/components/SearchableIngredientSelect";
import { ShotsStepper } from "@/components/ShotsStepper";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DRINK_MODES: DrinkMode[] = ["ICED", "HOT", "CONCENTRATED"];
const MODE_LABELS: Record<DrinkMode, string> = {
  HOT: "Hot",
  ICED: "Iced",
  CONCENTRATED: "Concentrated",
};

const DEFAULT_DRINK_SIZES_BY_MODE: DrinkSizesByModePayload["drinkSizesByMode"] = {
  ICED: { enabledOptionIds: [], defaultOptionId: null },
  HOT: { enabledOptionIds: [], defaultOptionId: null },
  CONCENTRATED: { enabledOptionIds: [], defaultOptionId: null },
};

type SizeRecipeLine = {
  ingredientId: string;
  baseType: DrinkMode;
  sizeCode: string;
  qtyPerItem: number;
  unitCode: string;
};

function parseQty(v: number | string): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? 0 : n;
}

/** Price input: store cents internally when focused, display prop when not. No effect - pure render. */
function PriceCentsInput({
  valueCents,
  onChange,
  disabled,
  className,
}: {
  valueCents: number | undefined;
  onChange: (cents: number | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);

  // Pure display: when focused use local, when not focused use valueCents. No effect.
  const displayValue = focused
    ? local
    : valueCents != null
      ? (valueCents / 100).toFixed(2)
      : "";

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={displayValue}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => {
        setFocused(true);
        setLocal(valueCents != null ? (valueCents / 100).toFixed(2) : "");
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseFloat(local.replace(/,/g, ""));
        if (!Number.isNaN(parsed) && parsed >= 0) {
          onChange(Math.round(parsed * 100));
        } else if (local.trim() === "") {
          onChange(undefined);
        } else {
          onChange(valueCents);
        }
      }}
      className={className}
    />
  );
}

export type ItemFormProps = {
  mode: "create" | "edit";
  itemId?: string;
  presetCategoryId?: string;
  presetSubCategoryId?: string;
  existingItem?: MenuItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
};

export default function ItemForm({
  mode,
  itemId,
  presetCategoryId = "",
  presetSubCategoryId = "",
  existingItem = null,
  onSuccess,
  onCancel,
  showDelete = false,
  onDelete,
}: ItemFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [menuSizes, setMenuSizes] = useState<MenuSize[]>([]);
  const [sizeVariants, setSizeVariants] = useState<{ id: string; mode: string; sizeId: string; sizeLabel: string; imageUrl: string | null }[]>([]);
  const [sizeAvailability, setSizeAvailability] = useState<{
    ICED: string[];
    HOT: string[];
    CONCENTRATED: string[];
  }>({ ICED: [], HOT: [], CONCENTRATED: [] });
  const [drinkSizes, setDrinkSizes] = useState<DrinkSizesResponse | null>(null);
  const [sizesError, setSizesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [pricePesos, setPricePesos] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [hasSizes, setHasSizes] = useState(false);
  const [drinkSizesByMode, setDrinkSizesByMode] =
    useState<DrinkSizesByModePayload["drinkSizesByMode"]>(DEFAULT_DRINK_SIZES_BY_MODE);
  const [defaultSizeVariant, setDefaultSizeVariant] = useState<{
    mode: DrinkMode;
    optionId: string;
  } | null>(null);
  const [sizePricesByMode, setSizePricesByMode] =
    useState<DrinkSizesByModePayload["sizePricesByMode"]>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [supportsShots, setSupportsShots] = useState(false);
  const [defaultShots, setDefaultShots] = useState(1);
  const [modifierGroups, setModifierGroups] = useState<{ id: string; name: string; required?: boolean; defaultOption?: { id: string; name: string } | null; options?: { id: string; name: string }[] }[]>([]);
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = useState<string[]>([]);
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [selectedAddOnGroupIds, setSelectedAddOnGroupIds] = useState<string[]>([]);
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [substituteConfigs, setSubstituteConfigs] = useState<{ substituteId: string; priceCents: number; recipeQtyMl: number | null }[]>([]);
  const [defaultSubstituteId, setDefaultSubstituteId] = useState<string | null>(null);

  const [recipeLines, setRecipeLines] = useState<
    { ingredientId: string; qtyPerItem: number; unitCode: string }[]
  >([]);
  const [sizeRecipeLines, setSizeRecipeLines] = useState<SizeRecipeLine[]>([]);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newByVariant, setNewByVariant] = useState<
    Record<string, { ingredientId: string; qty: string }>
  >({});

  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories : []),
    [categories]
  );
  const subCategories = useMemo(
    () =>
      categoryId
        ? normalizeSubCategories(
            safeCategories.find((c) => c.id === categoryId)?.subCategories
          )
        : [],
    [categoryId, safeCategories]
  );

  useEffect(() => {
    api.getModifierGroups().then(setModifierGroups).catch(() => {});
  }, []);
  useEffect(() => {
    api.getAddOnGroups().then(setAddOnGroups).catch(() => {});
  }, []);
  useEffect(() => {
    api.getSubstitutes().then(setSubstitutes).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([api.getDrinkSizes(), api.getMenuSizes()])
      .then(([optSizes, menuSizesResult]) => {
        setDrinkSizes(optSizes);
        setMenuSizes(menuSizesResult.sizes ?? []);
        setSizeVariants(menuSizesResult.variants ?? []);
        if (menuSizesResult.availability) {
          setSizeAvailability({
            ICED: menuSizesResult.availability.ICED ?? [],
            HOT: menuSizesResult.availability.HOT ?? [],
            CONCENTRATED: menuSizesResult.availability.CONCENTRATED ?? [],
          });
        }
      })
      .catch(() => setSizesError("Missing sizes. Run db:seed and configure Menu Settings → Sizes."));
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getCategories(),
      api.getIngredients(),
      api.getIngredientCategories(),
      itemId ? api.getItem(itemId) : Promise.resolve(null),
      itemId ? api.getRecipe(itemId) : Promise.resolve({ lines: [], sizeLines: [] as any }),
    ])
      .then(([cats, ings, ingCats, item, recipe]: any) => {
        if (cancelled) return;

        const normalizedCats = normalizeCategoriesResponse(cats).categories;
        setCategories(normalizedCats);
        setIngredients(Array.isArray(ings) ? ings : []);
        setIngredientCategories(Array.isArray(ingCats) ? ingCats : []);

        if (item) {
          setName(item.name);
          setPricePesos((item.priceCents / 100).toFixed(2));
          setIsActive(item.isActive);
          setCategoryId(item.categoryId ?? item.subCategory?.categoryId ?? "");
          setSubCategoryId(item.subCategoryId ?? "");
          setHasSizes(item.hasSizes ?? false);

          const configs = item.drinkSizeConfigs ?? [];
          const next = { ...DEFAULT_DRINK_SIZES_BY_MODE };
          for (const modeKey of DRINK_MODES) {
            next[modeKey].enabledOptionIds = configs
              .filter((c: any) => c.mode === modeKey && c.isEnabled)
              .map((c: any) => c.optionId);
          }
          setDrinkSizesByMode(next);

          if (item.hasSizes) {
            const defaults = (item as any).drinkModeDefaults ?? [];
            let loaded: { mode: DrinkMode; optionId: string } | null = null;
            for (const d of defaults) {
              const modeKey = d.mode as DrinkMode;
              const optId = d.defaultOptionId ?? d.option?.id;
              if (optId && next[modeKey].enabledOptionIds.includes(optId)) {
                loaded = { mode: modeKey, optionId: optId };
                break;
              }
            }
            if (!loaded) {
              for (const m of DRINK_MODES) {
                const ids = next[m].enabledOptionIds;
                if (ids.length > 0) {
                  loaded = { mode: m, optionId: ids[0] };
                  break;
                }
              }
            }
            setDefaultSizeVariant(loaded);
          } else {
            setDefaultSizeVariant(null);
          }

          const sizePrices = (item.sizePrices ?? []) as MenuItemSizePrice[];
          if (sizePrices.length > 0) {
            const byMode: any = {};
            for (const modeKey of DRINK_MODES) {
              const entries = sizePrices.filter((p) => p.baseType === modeKey);
              if (entries.length > 0) {
                byMode[modeKey] = Object.fromEntries(
                  entries.map((p) => [p.sizeOptionId, p.priceCents])
                );
              }
            }
            setSizePricesByMode(byMode);
          }

          setSupportsShots(item.supportsShots ?? false);
          setDefaultShots(item.defaultShots ?? 1);
          const links = (item as { optionGroupLinks?: { groupId: string; group?: { isSizeGroup?: boolean } }[] }).optionGroupLinks ?? [];
          setSelectedModifierGroupIds(links.filter((l) => !l.group?.isSizeGroup).map((l) => l.groupId));
          const addOnGroupLinks = (item as { addOnGroupLinks?: { groupId: string }[] }).addOnGroupLinks ?? [];
          setSelectedAddOnGroupIds(addOnGroupLinks.map((l) => l.groupId));
          const subLinks = (item as {
            substituteLinks?: Array<{ substituteId: string; priceCents?: number; recipeQtyMl?: number | null }>;
          }).substituteLinks ?? [];
          if (subLinks.length > 0) {
            setSubstituteConfigs(
              subLinks.map((l) => ({
                substituteId: l.substituteId,
                priceCents: l.priceCents ?? 0,
                recipeQtyMl: l.recipeQtyMl != null ? l.recipeQtyMl : null,
              }))
            );
            const defId = (item as { defaultSubstituteId?: string | null }).defaultSubstituteId ?? null;
            setDefaultSubstituteId(defId);
          } else {
            setSubstituteConfigs([]);
            setDefaultSubstituteId(null);
          }

          setRecipeLines(
            (recipe?.lines ?? []).map((r: any) => ({
              ingredientId: r.ingredientId,
              qtyPerItem: parseQty(r.qtyPerItem),
              unitCode: r.unitCode,
            }))
          );
          setSizeRecipeLines(() => {
            const raw = (recipe?.sizeLines ?? []).map((r: RecipeLineSize) => ({
              ingredientId: r.ingredientId,
              baseType: r.baseType,
              sizeCode: r.sizeCode,
              qtyPerItem: parseQty(r.qtyPerItem),
              unitCode: r.unitCode,
            }));
            const seen = new Map<string, (typeof raw)[0]>();
            for (const l of raw) {
              const key = `${l.ingredientId}__${l.baseType}__${l.sizeCode}`;
              if (!seen.has(key)) seen.set(key, l);
            }
            return Array.from(seen.values());
          });
        } else if (presetSubCategoryId || presetCategoryId) {
          const safeCats = normalizedCats;
          if (presetSubCategoryId) {
            for (const cat of safeCats) {
              const subs = normalizeSubCategories(cat.subCategories);
              const sub = subs.find((s) => s.id === presetSubCategoryId);
              if (sub) {
                setCategoryId(cat.id);
                setSubCategoryId(sub.id);
                break;
              }
            }
          } else if (presetCategoryId) {
            setCategoryId(presetCategoryId);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, itemId, presetCategoryId, presetSubCategoryId]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function setModeEnabled(modeKey: DrinkMode, optionId: string, enabled: boolean) {
    setDrinkSizesByMode((prev) => {
      const next = { ...prev };
      const enabledIds = enabled
        ? [...prev[modeKey].enabledOptionIds, optionId]
        : prev[modeKey].enabledOptionIds.filter((id) => id !== optionId);
      next[modeKey] = { ...prev[modeKey], enabledOptionIds: enabledIds, defaultOptionId: null };
      return next;
    });
    if (!enabled && defaultSizeVariant?.mode === modeKey && defaultSizeVariant?.optionId === optionId) {
      setDefaultSizeVariant(null);
    }
  }

  const getModeOptions = useCallback(
    (modeKey: DrinkMode) => {
      if (!drinkSizes) return [];
      const idsForMode = sizeAvailability[modeKey] ?? [];
      const labelById = new Map(menuSizes.map((s) => [s.id, s.label]));
      const allowedLabels = new Set(
        idsForMode
          .map((id) => labelById.get(id))
          .filter((l): l is string => !!l)
      );
      if (allowedLabels.size === 0) return drinkSizes.options;
      return drinkSizes.options.filter((o) => allowedLabels.has(o.label));
    },
    [drinkSizes, sizeAvailability, menuSizes]
  );

  function buildDrinkSizesByModeWithDefaults(): DrinkSizesByModePayload["drinkSizesByMode"] {
    const result = { ...DEFAULT_DRINK_SIZES_BY_MODE };
    for (const m of DRINK_MODES) {
      const enabled = drinkSizesByMode[m].enabledOptionIds;
      const defaultId =
        defaultSizeVariant?.mode === m
          ? defaultSizeVariant.optionId
          : enabled[0] ?? null;
      result[m] = {
        ...drinkSizesByMode[m],
        defaultOptionId: enabled.includes(defaultId ?? "") ? defaultId : enabled[0] ?? null,
      };
    }
    return result;
  }

  function addRecipeLine(unitCode?: string) {
    if (!newIngredientId || newQty === "") return;
    const qty = parseFloat(newQty);
    if (Number.isNaN(qty) || qty < 0) return;
    const ing = ingredients.find((i) => i.id === newIngredientId);
    const unit = unitCode ?? ing?.unitCode ?? "unit";
    setRecipeLines((prev) => [
      ...prev,
      { ingredientId: newIngredientId, qtyPerItem: qty, unitCode: unit },
    ]);
    setNewIngredientId("");
    setNewQty("");
  }

  function removeRecipeLine(index: number) {
    const line = recipeLines[index];
    setRecipeLines((prev) => prev.filter((_, i) => i !== index));
    if (line)
      setSizeRecipeLines((prev) =>
        prev.filter((r) => r.ingredientId !== line.ingredientId)
      );
  }

  function addSizeRecipeLine(
    baseType: DrinkMode,
    sizeCode: string,
    ingredientId: string,
    qtyPerItem: number,
    unitCode: string
  ) {
    if (!ingredientId || Number.isNaN(qtyPerItem) || qtyPerItem < 0) return;
    const unit = unitCode.trim() || "unit";
    setSizeRecipeLines((prev) => {
      const next = prev.filter(
        (r) =>
          !(r.ingredientId === ingredientId && r.baseType === baseType && r.sizeCode === sizeCode)
      );
      next.push({ ingredientId, baseType, sizeCode, qtyPerItem, unitCode: unit });
      return next;
    });
  }

  function removeSizeRecipeLine(ingredientId: string, baseType: DrinkMode, sizeCode: string) {
    setSizeRecipeLines((prev) =>
      prev.filter(
        (r) =>
          !(r.ingredientId === ingredientId && r.baseType === baseType && r.sizeCode === sizeCode)
      )
    );
  }

  function copySectionTo(
    fromMode: DrinkMode,
    fromCode: string,
    toMode: DrinkMode,
    toCode: string
  ) {
    const source = sizeRecipeLines.filter(
      (r) => r.baseType === fromMode && r.sizeCode === fromCode
    );
    if (source.length === 0) return;
    setSizeRecipeLines((prev) => {
      const withoutTarget = prev.filter(
        (r) => !(r.baseType === toMode && r.sizeCode === toCode)
      );
      const next = [...withoutTarget];
      for (const r of source) {
        next.push({
          ingredientId: r.ingredientId,
          baseType: toMode,
          sizeCode: toCode,
          qtyPerItem: r.qtyPerItem,
          unitCode: r.unitCode,
        });
      }
      return next;
    });
  }

  function setNewForVariant(
    variantKey: string,
    patch: Partial<{ ingredientId: string; qty: string }>
  ) {
    setNewByVariant((prev) => ({
      ...prev,
      [variantKey]: { ...(prev[variantKey] ?? { ingredientId: "", qty: "" }), ...patch },
    }));
  }

  const ingredientById = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );
  const sizeImageByModeAndLabel = useMemo(
    () => new Map(sizeVariants.map((v) => [`${v.mode}:${v.sizeLabel}`, v.imageUrl])),
    [sizeVariants]
  );
  const sizeImageUrl = (mode: string, label: string) => {
    const url = sizeImageByModeAndLabel.get(`${mode}:${label}`);
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  };
  const ingredientName = (id: string) => ingredientById.get(id)?.name ?? id;
  const ingredientUnit = (id: string) => ingredientById.get(id)?.unitCode ?? "unit";
  const ingredientImageUrl = (id: string) => {
    const ing = ingredientById.get(id);
    if (!ing?.imageUrl) return null;
    return ing.imageUrl.startsWith("http") ? ing.imageUrl : `${API_URL}${ing.imageUrl}`;
  };

  const enabledSizeColumns = useMemo(() => {
    const cols: { mode: DrinkMode; optionId: string; label: string }[] = [];
    if (drinkSizes && hasSizes) {
      for (const m of DRINK_MODES) {
        const ids = drinkSizesByMode[m].enabledOptionIds;
        for (const optId of ids) {
          const opt = drinkSizes.options.find((o) => o.id === optId);
          if (opt) cols.push({ mode: m, optionId: optId, label: opt.label });
        }
      }
    }
    return cols;
  }, [drinkSizes, hasSizes, drinkSizesByMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!categoryId || !subCategoryId) {
      setError("Category and subcategory are required.");
      return;
    }
    let priceCents: number;
    if (hasSizes) {
      const missing: string[] = [];
      for (const m of DRINK_MODES) {
        for (const optId of drinkSizesByMode[m].enabledOptionIds) {
          const cents = sizePricesByMode?.[m]?.[optId];
          if (cents == null || cents < 0) {
            missing.push(`${MODE_LABELS[m]}`);
            break;
          }
        }
      }
      if (missing.length > 0) {
        setError("Enter a price for every enabled size.");
        return;
      }
      if (enabledSizeColumns.length > 0 && !defaultSizeVariant) {
        setError("Select a default size.");
        return;
      }
      let min = Infinity;
      for (const m of DRINK_MODES) {
        const map = sizePricesByMode?.[m];
        if (!map) continue;
        for (const v of Object.values(map)) {
          if (typeof v === "number" && v >= 0 && v < min) min = v;
        }
      }
      priceCents = min === Infinity ? 0 : min;
    } else {
      const peso = parseFloat(pricePesos);
      if (Number.isNaN(peso) || peso < 0) {
        setError("Enter a valid base price.");
        return;
      }
      priceCents = Math.round(peso * 100);
    }

    if (substituteConfigs.length > 0) {
      if (!defaultSubstituteId) {
        setError("Default milk is required when substitutes are enabled. Select a default from the dropdown.");
        return;
      }
      for (const c of substituteConfigs) {
        if (c.priceCents < 0) {
          setError(`Price for ${substitutes.find((s) => s.id === c.substituteId)?.name ?? c.substituteId} must be 0 or greater.`);
          return;
        }
        if (c.recipeQtyMl != null && c.recipeQtyMl < 0) {
          setError(`Recipe consumption for ${substitutes.find((s) => s.id === c.substituteId)?.name ?? c.substituteId} must be 0 or greater.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const item = await api.createItem({
          name,
          priceCents,
          isActive,
          subCategoryId,
          defaultSizeOptionId: null,
          hasSizes,
          supportsShots,
          defaultShots: supportsShots ? defaultShots : null,
        });
        await api.putItemDrinkSizes(item.id, {
          drinkSizesByMode: hasSizes
            ? buildDrinkSizesByModeWithDefaults()
            : DEFAULT_DRINK_SIZES_BY_MODE,
          hasSizes,
          sizePricesByMode: hasSizes ? sizePricesByMode : undefined,
        });
        if (imageFile) await api.uploadItemImage(item.id, imageFile);
        await api.putItemOptionGroups(item.id, selectedModifierGroupIds);
        await api.putItemAddOnGroups(item.id, selectedAddOnGroupIds);
        await api.putItemSubstitutes(item.id, substituteConfigs, defaultSubstituteId);
        onSuccess?.();
      } else if (itemId) {
        await api.updateItem(itemId, {
          name,
          priceCents,
          isActive,
          categoryId,
          subCategoryId,
          defaultSizeOptionId: null,
          hasSizes,
          supportsShots,
          defaultShots: supportsShots ? defaultShots : null,
        });
        await api.putItemDrinkSizes(itemId, {
          drinkSizesByMode: hasSizes
            ? buildDrinkSizesByModeWithDefaults()
            : DEFAULT_DRINK_SIZES_BY_MODE,
          hasSizes,
          sizePricesByMode: hasSizes ? sizePricesByMode : undefined,
        });
        if (imageFile) await api.uploadItemImage(itemId, imageFile);
        await api.putItemOptionGroups(itemId, selectedModifierGroupIds);
        await api.putItemAddOnGroups(itemId, selectedAddOnGroupIds);
        await api.putItemSubstitutes(itemId, substituteConfigs, defaultSubstituteId);
        onSuccess?.();
      }
    } catch (err: any) {
      const body = err?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecipe() {
    if (!itemId) return;
    setError("");
    setSaving(true);
    try {
      const basePayload =
        hasSizes
          ? []
          : recipeLines.map((r) => ({
              ingredientId: r.ingredientId,
              qtyPerItem: r.qtyPerItem,
              unitCode: r.unitCode,
            }));
      const sizePayload =
        hasSizes && sizeRecipeLines.length > 0
          ? sizeRecipeLines
              .filter((r) => r.qtyPerItem > 0)
              .map((r) => ({
                ingredientId: r.ingredientId,
                baseType: r.baseType,
                sizeCode: r.sizeCode,
                qtyPerItem: r.qtyPerItem,
                unitCode: r.unitCode,
              }))
          : undefined;
      await api.putRecipe(itemId, basePayload, hasSizes ? (sizePayload ?? []) : undefined);
      onSuccess?.();
    } catch (err: any) {
      setError(
        err?.body?.message ??
          (err instanceof Error ? err.message : "Failed to save recipe")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-6">Loading…</div>;

  return (
    <form onSubmit={handleSubmit} className="mb-8 max-w-3xl space-y-4 rounded border bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Image</label>
        <div className="flex items-center gap-3">
          {imagePreview ? (
            <img src={imagePreview} alt="" className="h-20 w-20 rounded border object-cover" />
          ) : existingItem?.imageUrl ? (
            <img
              src={
                existingItem.imageUrl.startsWith("http")
                  ? existingItem.imageUrl
                  : `${API_URL}${existingItem.imageUrl}`
              }
              alt=""
              className="h-20 w-20 rounded border object-cover"
            />
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
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {!hasSizes && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Base Price (₱)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={pricePesos}
            onChange={(e) => setPricePesos(e.target.value)}
            required={!hasSizes}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubCategoryId("");
          }}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="">—</option>
          {safeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {categoryId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Subcategory <span className="text-red-500">*</span>
          </label>
          <select
            value={subCategoryId}
            onChange={(e) => setSubCategoryId(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Select subcategory</option>
            {subCategories.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded border border-gray-200 bg-gray-50 p-3">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={hasSizes}
            onChange={(e) => {
              const v = e.target.checked;
              setHasSizes(v);
              if (!v) {
                setDrinkSizesByMode(DEFAULT_DRINK_SIZES_BY_MODE);
                setDefaultSizeVariant(null);
              }
            }}
            className="rounded border-gray-300"
          />
          Has Sizes
        </label>
        <p className="mb-2 text-xs text-gray-500">
          Enable sizes and set prices per mode. Sizes come from Menu Settings.
        </p>
        {sizesError && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 text-sm text-amber-800">{sizesError}</p>
            <Link
              href="/menu-settings/sizes"
              className="inline-block rounded bg-amber-600 px-3 py-1.5 text-sm text-white"
            >
              Go to Menu Settings → Sizes
            </Link>
          </div>
        )}
        {hasSizes && drinkSizes && drinkSizes.options.length > 0 && (
          <>
            <div className="mt-3 space-y-4">
              {DRINK_MODES.map((modeKey) => {
              const { enabledOptionIds } = drinkSizesByMode[modeKey];
              const modePrices = sizePricesByMode?.[modeKey] ?? {};
              const modeOptions = getModeOptions(modeKey);
              return (
                <div key={modeKey} className="rounded border border-gray-200 bg-white p-3">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">
                    {MODE_LABELS[modeKey]}
                  </h4>
                  <div className="space-y-2">
                    {modeOptions.map((o) => {
                      const enabled = enabledOptionIds.includes(o.id);
                      const imgUrl = sizeImageUrl(modeKey, o.label);
                      return (
                        <div key={o.id} className="flex items-center gap-3 text-sm">
                          <label className="flex shrink-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) =>
                                setModeEnabled(modeKey, o.id, e.target.checked)
                              }
                              className="rounded border-gray-300"
                            />
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt=""
                                className="h-9 w-9 rounded object-cover"
                              />
                            ) : (
                              <span className="flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-400 text-xs">—</span>
                            )}
                            <span className="w-16">{o.label}</span>
                          </label>
                          <span className="text-gray-500">Price (₱):</span>
                          <PriceCentsInput
                            valueCents={modePrices[o.id]}
                            onChange={(cents) => {
                              setSizePricesByMode((prev) => {
                                const next = { ...prev };
                                const modeMap = { ...(next[modeKey] ?? {}) };
                                if (cents != null) modeMap[o.id] = cents;
                                else delete modeMap[o.id];
                                (next as any)[modeKey] = modeMap;
                                return next;
                              });
                            }}
                            disabled={!enabled}
                            className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
            {enabledSizeColumns.length > 0 && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Default Size
                </label>
                <select
                  value={
                    defaultSizeVariant
                      ? `${defaultSizeVariant.mode}:${defaultSizeVariant.optionId}`
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setDefaultSizeVariant(null);
                      return;
                    }
                    const [mode, optionId] = v.split(":");
                    if (mode && optionId)
                      setDefaultSizeVariant({ mode: mode as DrinkMode, optionId });
                  }}
                  className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Select default —</option>
                  {enabledSizeColumns.map((col) => (
                    <option
                      key={`${col.mode}:${col.optionId}`}
                      value={`${col.mode}:${col.optionId}`}
                    >
                      {col.label} {MODE_LABELS[col.mode]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Preselected size when the item is opened (e.g. in POS).
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded border border-gray-200 bg-gray-50 p-3">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={supportsShots}
            onChange={(e) => {
              const v = e.target.checked;
              setSupportsShots(v);
              if (!v) setDefaultShots(1);
            }}
            className="rounded border-gray-300"
          />
          Supports Shots
        </label>
        <p className="mb-3 text-xs text-gray-500">
          Default shots are included free. Extra shots use Menu Settings → Shots pricing.
        </p>
        {supportsShots && (
          <ShotsStepper
            label="Default Shots (included free)"
            value={defaultShots}
            onChange={setDefaultShots}
            min={0}
            max={20}
          />
        )}
      </div>

      {modifierGroups.length > 0 && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Modifiers</h3>
          <p className="mb-3 text-xs text-gray-500">
            Assign modifier sections from Menu Settings. Configure required/default in Menu Settings → Modifiers.
          </p>
          <div className="flex flex-wrap gap-3">
            {modifierGroups.map((g) => {
              const checked = selectedModifierGroupIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedModifierGroupIds((prev) => [...prev, g.id]);
                      } else {
                        setSelectedModifierGroupIds((prev) => prev.filter((id) => id !== g.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">{g.name}</span>
                  {g.required && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Required</span>
                  )}
                  {g.defaultOption && (
                    <span className="text-gray-500 text-xs">Default: {g.defaultOption.name}</span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <Link href="/menu-settings/modifiers" className="text-teal-600 hover:underline">
              Manage modifier sections →
            </Link>
          </p>
        </div>
      )}

      {addOnGroups.length > 0 && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Add-on Groups</h3>
          <p className="mb-3 text-xs text-gray-500">
            Optional extras from Menu Settings. Select groups to enable for this item.
          </p>
          <div className="flex flex-wrap gap-3">
            {addOnGroups.filter((g) => g.isActive).map((g) => {
              const checked = selectedAddOnGroupIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAddOnGroupIds((prev) => [...prev, g.id]);
                      } else {
                        setSelectedAddOnGroupIds((prev) => prev.filter((id) => id !== g.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">{g.name}</span>
                  <span className="text-gray-500 text-xs">({(g.options ?? []).length} options)</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <Link href="/menu-settings/add-ons" className="text-teal-600 hover:underline">
              Manage add-on groups →
            </Link>
          </p>
        </div>
      )}

      {substitutes.length > 0 && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Milk substitutes</h3>
          <p className="mb-3 text-xs text-gray-500">
            Choose allowed milk types, set price and recipe consumption per item. Default milk is free.
          </p>
          <div className="flex flex-wrap gap-3">
            {substitutes.filter((s) => s.isActive).map((s) => {
              const isSelected = substituteConfigs.some((c) => c.substituteId === s.id);
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSubstituteConfigs((prev) => {
                          if (prev.some((c) => c.substituteId === s.id)) return prev;
                          return [...prev, { substituteId: s.id, priceCents: 0, recipeQtyMl: null }];
                        });
                        if (!defaultSubstituteId) setDefaultSubstituteId(s.id);
                      } else {
                        setSubstituteConfigs((prev) => {
                          const next = prev.filter((c) => c.substituteId !== s.id);
                          return next;
                        });
                        setDefaultSubstituteId((prev) =>
                          prev === s.id ? (substituteConfigs.filter((c) => c.substituteId !== s.id)[0]?.substituteId ?? null) : prev
                        );
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">{s.name}</span>
                </label>
              );
            })}
          </div>
          {substituteConfigs.length > 0 && (
            <>
              <div className="mt-3 space-y-3">
                {substituteConfigs.map((c) => {
                  const sub = substitutes.find((s) => s.id === c.substituteId);
                  return (
                    <div
                      key={c.substituteId}
                      className="rounded border border-gray-200 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-gray-800">{sub?.name ?? c.substituteId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSubstituteConfigs((prev) => prev.filter((x) => x.substituteId !== c.substituteId));
                            if (defaultSubstituteId === c.substituteId) {
                              const remaining = substituteConfigs.filter((x) => x.substituteId !== c.substituteId);
                              setDefaultSubstituteId(remaining[0]?.substituteId ?? null);
                            }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-600">Price (₱)</label>
                          <PriceCentsInput
                            valueCents={c.priceCents}
                            onChange={(cents) =>
                              setSubstituteConfigs((prev) =>
                                prev.map((x) =>
                                  x.substituteId === c.substituteId
                                    ? { ...x, priceCents: cents ?? 0 }
                                    : x
                                )
                              )
                            }
                            className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-600">Recipe (ml)</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={c.recipeQtyMl ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "") {
                                setSubstituteConfigs((prev) =>
                                  prev.map((x) =>
                                    x.substituteId === c.substituteId ? { ...x, recipeQtyMl: null } : x
                                  )
                                );
                              } else {
                                const n = parseFloat(v);
                                const val = Number.isNaN(n) || n < 0 ? 0 : Math.round(n);
                                setSubstituteConfigs((prev) =>
                                  prev.map((x) =>
                                    x.substituteId === c.substituteId ? { ...x, recipeQtyMl: val } : x
                                  )
                                );
                              }
                            }}
                            placeholder="—"
                            className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">Default milk (required, free)</label>
                <select
                  value={defaultSubstituteId ?? ""}
                  onChange={(e) => setDefaultSubstituteId(e.target.value || null)}
                  className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Select default —</option>
                  {substituteConfigs
                    .map((c) => substitutes.find((s) => s.id === c.substituteId))
                    .filter((s): s is Substitute => !!s)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                {substituteConfigs.length > 0 && !defaultSubstituteId && (
                  <p className="mt-1 text-xs text-red-600">Default milk is required when substitutes are enabled.</p>
                )}
              </div>
            </>
          )}
          <p className="mt-2 text-xs text-gray-500">
            <Link href="/menu-settings/substitutes" className="text-teal-600 hover:underline">
              Manage milk substitute types →
            </Link>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">
          Active
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !categoryId || !subCategoryId}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
            Cancel
          </button>
        )}
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded border border-red-200 px-3 py-1.5 text-red-600 disabled:opacity-50"
          >
            Delete item
          </button>
        )}
      </div>

      {mode === "edit" && itemId && (
        <section className="mt-8 rounded border bg-white p-4">
          <h2 className="mb-3 text-lg font-medium">Recipe</h2>

          {hasSizes && enabledSizeColumns.length > 0 ? (
            <div className="space-y-6">
              {enabledSizeColumns.map((col) => {
                const variantKey = `${col.mode}:${col.label}`;
                const sectionTitle = `${name || "Item"} ${col.label} ${MODE_LABELS[col.mode]}`;
                const sectionLines = sizeRecipeLines.filter(
                  (r) => r.baseType === col.mode && r.sizeCode === col.label
                );
                const newState = newByVariant[variantKey] ?? {
                  ingredientId: "",
                  qty: "",
                };
                return (
                  <div
                    key={variantKey}
                    className="rounded border border-gray-200 bg-gray-50 p-4"
                  >
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                      {sizeImageUrl(col.mode, col.label) ? (
                        <img
                          src={sizeImageUrl(col.mode, col.label)!}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-gray-400 text-xs">—</span>
                      )}
                      {sectionTitle}
                    </h3>
                    <ul className="mb-4 space-y-2">
                      {sectionLines.map((r) => {
                        const unit = ingredientUnit(r.ingredientId);
                        const imgUrl = ingredientImageUrl(r.ingredientId);
                        return (
                        <li
                          key={`${r.ingredientId}-${r.baseType}-${r.sizeCode}`}
                          className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                              {imgUrl ? (
                                <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                </svg>
                              )}
                            </span>
                            <span>{ingredientName(r.ingredientId)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs">Qty:</span>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={r.qtyPerItem}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!Number.isNaN(v) && v >= 0) {
                                  setSizeRecipeLines((prev) =>
                                    prev.map((x) =>
                                      x.ingredientId === r.ingredientId &&
                                      x.baseType === r.baseType &&
                                      x.sizeCode === r.sizeCode
                                        ? { ...x, qtyPerItem: v }
                                        : x
                                    )
                                  );
                                }
                              }}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                            />
                            <span className="w-10 text-gray-500">{unit}</span>
                            <button
                              type="button"
                              onClick={() =>
                                removeSizeRecipeLine(r.ingredientId, r.baseType, r.sizeCode)
                              }
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Remove"
                            >
                              <span aria-hidden>🗑</span>
                            </button>
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                    <div className="flex flex-wrap items-end gap-2 border-t border-gray-200 pt-3">
                      <div className="min-w-[280px] sm:min-w-[360px] max-w-full">
                        <label className="mb-1 block text-xs text-gray-500">Ingredient</label>
                        <SearchableIngredientSelect
                          ingredients={ingredients}
                          ingredientCategories={ingredientCategories}
                          value={newState.ingredientId}
                          onChange={(id) => setNewForVariant(variantKey, { ingredientId: id })}
                          excludeIds={sectionLines.map((l) => l.ingredientId)}
                          placeholder="Select"
                          size="sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">
                          Qty {newState.ingredientId ? `(${ingredientUnit(newState.ingredientId)})` : ""}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={newState.qty}
                          onChange={(e) => setNewForVariant(variantKey, { qty: e.target.value })}
                          placeholder="0"
                          className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const qty = parseFloat(newState.qty);
                          const unit = newState.ingredientId
                            ? ingredientUnit(newState.ingredientId)
                            : "unit";
                          if (newState.ingredientId && !Number.isNaN(qty) && qty >= 0) {
                            addSizeRecipeLine(
                              col.mode,
                              col.label,
                              newState.ingredientId,
                              qty,
                              unit
                            );
                            setNewForVariant(variantKey, {
                              ingredientId: "",
                              qty: "",
                            });
                          }
                        }}
                        className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                      >
                        + Add
                      </button>
                      {enabledSizeColumns.filter((c) => c.mode !== col.mode || c.label !== col.label).length > 0 && (
                        <div className="flex items-end gap-1">
                          <label className="mb-1 block text-xs text-gray-500">Copy to</label>
                          <select
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                            defaultValue=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              const [toMode, toCode] = v.split(":");
                              if (toMode && toCode)
                                copySectionTo(col.mode, col.label, toMode as DrinkMode, toCode);
                              e.target.value = "";
                            }}
                          >
                            <option value="">—</option>
                            {enabledSizeColumns
                              .filter((c) => c.mode !== col.mode || c.label !== col.label)
                              .map((c) => (
                                <option
                                  key={`${c.mode}:${c.label}`}
                                  value={`${c.mode}:${c.label}`}
                                >
                                  {c.label} {MODE_LABELS[c.mode]}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSizes && enabledSizeColumns.length === 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Enable at least one size above to edit recipe per size variant.
            </p>
          ) : (
            <>
              <table className="mb-4 min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Ingredient
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recipeLines.map((line, idx) => {
                    const imgUrl = ingredientImageUrl(line.ingredientId);
                    const unit = ingredientUnit(line.ingredientId);
                    return (
                      <tr key={idx} className="align-middle">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                              {imgUrl ? (
                                <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                </svg>
                              )}
                            </span>
                            <span className="text-sm">{ingredientName(line.ingredientId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.qtyPerItem}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!Number.isNaN(v) && v >= 0) {
                                setRecipeLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, qtyPerItem: v } : l
                                  )
                                );
                              }
                            }}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{unit}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRecipeLine(idx)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                <div className="min-w-[280px] sm:min-w-[360px] max-w-full">
                  <label className="mb-1 block text-xs text-gray-500">Ingredient</label>
                  <SearchableIngredientSelect
                    ingredients={ingredients}
                    ingredientCategories={ingredientCategories}
                    value={newIngredientId}
                    onChange={(id) => setNewIngredientId(id)}
                    excludeIds={recipeLines.map((l) => l.ingredientId)}
                    placeholder="Select"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Qty {newIngredientId ? `(${ingredientUnit(newIngredientId)})` : ""}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="0"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addRecipeLine()}
                  className="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleSaveRecipe}
            disabled={saving}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving recipe…" : "Save recipe"}
          </button>
        </section>
      )}
    </form>
  );
}
