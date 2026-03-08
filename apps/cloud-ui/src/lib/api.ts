const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("cloud_token")
      : null;

  const method = (options.method || "GET").toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null && options.body !== "";

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API}${path.startsWith("/") ? path : `/${path}`}`;
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // Do not send credentials/cookies - we use Bearer token to avoid CORS preflight issues
    credentials: "omit",
  };

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const isNetwork = /failed to fetch|network error|load failed/i.test(msg);
    console.error("[apiFetch] Network error:", {
      url,
      method,
      error: msg,
      cause: fetchErr instanceof Error ? fetchErr.cause : undefined,
    });
    throw new Error(isNetwork ? "Network error. Check if the API is running and reachable." : msg);
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cloud_token");
      window.location.href = "/login";
    }
  }

  if (res.status === 204) return {} as any;
  let data: unknown;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    console.error("[apiFetch] Invalid JSON response:", { url, method, status: res.status });
    throw new Error(`Invalid response (${res.status})`);
  }
  if (res.status >= 400) {
    const errMsg = (data && typeof data === "object" && (data as Record<string, unknown>).message) || (data && typeof data === "object" && (data as Record<string, unknown>).error) || `Request failed (${res.status})`;
    const err = new Error(String(errMsg));
    (err as unknown as { status?: number; body?: unknown }).status = res.status;
    (err as unknown as { status?: number; body?: unknown }).body = data;
    throw err;
  }
  return data;
}

/** Normalize API response to Category[]. Returns { categories, debugError? } for defensive handling. */
export function normalizeCategoriesResponse(raw: unknown): {
  categories: Category[];
  debugError?: string;
} {
  if (Array.isArray(raw)) {
    return { categories: raw };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.categories)) {
      return { categories: obj.categories };
    }
    if (Array.isArray(obj.data)) {
      return { categories: obj.data };
    }
  }
  return {
    categories: [],
    debugError: `Unexpected categories response: ${JSON.stringify(raw)}`,
  };
}

/** Normalize subCategories on a category - ensure it's an array. */
export function normalizeSubCategories(subCategories: unknown): SubCategory[] {
  if (Array.isArray(subCategories)) return subCategories;
  return [];
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  subCategories?: SubCategory[];
};
export type SubCategory = {
  id: string;
  name: string;
  categoryId: string;
  sortOrder: number;
};
export type MenuSize = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

export type MenuSizeVariant = {
  id: string;
  mode: string;
  sizeId: string;
  sizeLabel: string;
  imageUrl: string | null;
  sortOrder: number;
};
export type MenuOptionGroupSection = {
  id: string;
  optionGroupId: string;
  key: string;
  label: string;
  sortOrder: number;
  isSystem?: boolean;
  isDeletable?: boolean;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  multi?: boolean;
  defaultOptionId?: string | null;
  defaultOption?: { id: string; name: string } | null;
  isSizeGroup?: boolean;
  isSystem?: boolean;
  isDeletable?: boolean;
  options?: MenuOption[];
  sections?: MenuOptionGroupSection[];
};
export type MenuOption = {
  id: string;
  name: string;
  priceDelta: number;
  groupId: string;
};
export type MenuItemOptionGroupLink = {
  id: string;
  groupId: string;
  group?: MenuOptionGroup;
};
export type MenuItemSize = {
  id: string;
  menuItemId: string;
  label: string;
  temp: "HOT" | "ICED" | "ANY";
  sortOrder: number;
  isActive: boolean;
};
export type DrinkSizeOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type DrinkSizesResponse = {
  optionGroupId: string;
  optionGroupName: string;
  options: DrinkSizeOption[];
};

export type DrinkMode = "ICED" | "HOT" | "CONCENTRATED";

export type DrinkSizeConfig = {
  id: string;
  menuItemId: string;
  mode: DrinkMode;
  optionId: string;
  isEnabled: boolean;
  option?: { id: string; name: string };
};

export type DrinkModeDefault = {
  id: string;
  menuItemId: string;
  mode: DrinkMode;
  defaultOptionId: string;
  option?: { id: string; name: string };
};

export type DrinkSizesByModePayload = {
  drinkSizesByMode: {
    ICED: { enabledOptionIds: string[]; defaultOptionId: string | null };
    HOT: { enabledOptionIds: string[]; defaultOptionId: string | null };
    CONCENTRATED: { enabledOptionIds: string[]; defaultOptionId: string | null };
  };
  hasSizes?: boolean;
  sizePricesByMode?: {
    ICED?: Record<string, number>;
    HOT?: Record<string, number>;
    CONCENTRATED?: Record<string, number>;
  };
};

export type MenuItemSizePrice = {
  id: string;
  baseType: DrinkMode;
  sizeOptionId: string;
  sizeCode: string;
  priceCents: number;
};

export type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  isActive: boolean;
  sortOrder?: number;
  imageUrl: string | null;
  deletedAt?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  defaultSizeId?: string | null;
  defaultSize?: MenuItemSize | null;
  defaultSizeOptionId?: string | null;
  defaultSizeOption?: { id: string; name: string } | null;
  sizes?: MenuItemSize[];
  drinkSizeConfigs?: DrinkSizeConfig[];
  drinkModeDefaults?: DrinkModeDefault[];
  hasSizes?: boolean;
  sizePrices?: MenuItemSizePrice[];
  category?: Category | null;
  subCategory?: SubCategory | null;
  recipeLines?: RecipeLine[];
  optionGroupLinks?: MenuItemOptionGroupLink[];
};
export type RecipeLine = {
  id: string;
  ingredientId: string;
  qtyPerItem: number | string;
  unitCode: string;
};

export type RecipeLineSize = {
  id: string;
  ingredientId: string;
  baseType: DrinkMode;
  sizeCode: string;
  qtyPerItem: number | string;
  unitCode: string;
};
export type Ingredient = {
  id: string;
  name: string;
  unitCode: string;
  isActive: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  sortOrder?: number;
  imageUrl?: string | null;
  department?: "BAR" | "KITCHEN" | "PASTRY" | "SHARED" | null;
};

export type IngredientCategory = {
  id: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type InventoryStockRow = {
  ingredientId: string;
  ingredientName: string;
  imageUrl: string | null;
  categoryName: string | null;
  unitCode: string;
  department?: string | null;
  trackingType?: string | null;
  storeStock: number;
  warehouseStock: number;
  stocksByLocation?: Record<string, number>;
  lastMovementAt: string | null;
};

export type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  locationType: string;
  isActive: boolean;
  sortOrder?: number;
};

export const api = {
  getItems(includeDeleted?: boolean): Promise<MenuItem[]> {
    const qs = includeDeleted ? "?includeDeleted=1" : "";
    return apiFetch(`/admin/items${qs}`);
  },

  getItem(id: string, includeDeleted?: boolean): Promise<MenuItem> {
    const qs = includeDeleted ? "?includeDeleted=1" : "";
    return apiFetch(`/admin/items/${id}${qs}`);
  },

  restoreItem(id: string): Promise<MenuItem> {
    return apiFetch(`/admin/items/${id}/restore`, { method: "POST" });
  },

  getDrinkSizes(): Promise<DrinkSizesResponse> {
    return apiFetch("/admin/drink-sizes");
  },

  putItemDrinkSizes(itemId: string, body: DrinkSizesByModePayload): Promise<MenuItem> {
    return apiFetch(`/admin/items/${itemId}/drink-sizes`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  createItem(body: {
    name: string;
    priceCents: number;
    isActive?: boolean;
    subCategoryId: string;
    defaultSizeOptionId?: string | null;
    hasSizes?: boolean;
    supportsShots?: boolean;
    defaultShots?: number | null;
  }): Promise<MenuItem> {
    return apiFetch("/admin/items", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        isActive: body.isActive ?? true,
        subCategoryId: body.subCategoryId,
      }),
    });
  },

  deleteItem(id: string): Promise<void> {
    return apiFetch(`/admin/items/${id}`, { method: "DELETE" });
  },
  updateItem(
    id: string,
    body: {
      name?: string;
      priceCents?: number;
      isActive?: boolean;
      categoryId?: string | null;
      subCategoryId?: string | null;
      defaultSizeOptionId?: string | null;
      hasSizes?: boolean;
      supportsShots?: boolean;
      defaultShots?: number | null;
      sortOrder?: number;
    }
  ): Promise<MenuItem> {
    return apiFetch(`/admin/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async uploadItemImage(id: string, file: File): Promise<{ imageUrl: string }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("cloud_token") : null;
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${API}/admin/items/${id}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data?.message || data?.error) ? String(data.message || data.error) : `Upload failed (${r.status})`);
    return data;
  },

  async getCategories(): Promise<Category[]> {
    const raw = await apiFetch("/admin/categories");
    return normalizeCategoriesResponse(raw).categories;
  },

  /** Fetch categories with debug info when response is unexpected. Use for debugging. */
  async getCategoriesWithDebug(): Promise<{ categories: Category[]; debugError?: string }> {
    const raw = await apiFetch("/admin/categories");
    return normalizeCategoriesResponse(raw);
  },
  createCategory(body: { name: string; slug?: string; sortOrder?: number }): Promise<Category> {
    return apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(body) });
  },
  patchCategory(id: string, body: { name?: string; slug?: string; sortOrder?: number }): Promise<Category> {
    return apiFetch(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  deleteCategory(id: string): Promise<void> {
    return apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
  },
  createSubCategory(body: { name: string; categoryId: string; sortOrder?: number }): Promise<SubCategory> {
    return apiFetch("/admin/subcategories", { method: "POST", body: JSON.stringify(body) });
  },
  createSubCategoryByCategory(categoryId: string, body: { name: string; sortOrder?: number }): Promise<SubCategory> {
    return apiFetch(`/admin/categories/${categoryId}/subcategories`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patchSubCategory(id: string, body: { name?: string; sortOrder?: number }): Promise<SubCategory> {
    return apiFetch(`/admin/subcategories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  deleteSubCategory(id: string): Promise<void> {
    return apiFetch(`/admin/subcategories/${id}`, { method: "DELETE" });
  },
  getOptionGroups(): Promise<MenuOptionGroup[]> {
    return apiFetch("/admin/option-groups");
  },
  /** Modifier sections only (isSizeGroup=false). For Menu Settings → Modifiers. */
  getModifierGroups(): Promise<MenuOptionGroup[]> {
    return apiFetch("/admin/option-groups").then((groups: MenuOptionGroup[]) =>
      (groups ?? []).filter((g) => !g.isSizeGroup)
    );
  },
  createOptionGroup(body: { name: string; required?: boolean; multi?: boolean; isSizeGroup?: boolean }): Promise<MenuOptionGroup> {
    return apiFetch("/admin/option-groups", { method: "POST", body: JSON.stringify(body) });
  },
  patchOptionGroup(id: string, body: { name?: string; required?: boolean; multi?: boolean; isSizeGroup?: boolean; defaultOptionId?: string | null }): Promise<MenuOptionGroup> {
    return apiFetch(`/admin/option-groups/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  deleteOptionGroup(id: string): Promise<void> {
    return apiFetch(`/admin/option-groups/${id}`, { method: "DELETE" });
  },
  addOption(groupId: string, body: { name: string; priceDelta?: number }): Promise<MenuOption> {
    return apiFetch(`/admin/option-groups/${groupId}/options`, { method: "POST", body: JSON.stringify(body) });
  },
  deleteOption(groupId: string, optionId: string): Promise<void> {
    return apiFetch(`/admin/option-groups/${groupId}/options/${optionId}`, { method: "DELETE" });
  },
  getItemSizes(itemId: string): Promise<MenuItemSize[]> {
    return apiFetch(`/admin/items/${itemId}/sizes`);
  },
  createItemSize(itemId: string, body: { label: string; temp?: "HOT" | "ICED" | "ANY"; sortOrder?: number; isActive?: boolean }): Promise<MenuItemSize> {
    return apiFetch(`/admin/items/${itemId}/sizes`, { method: "POST", body: JSON.stringify(body) });
  },
  updateItemSize(itemId: string, sizeId: string, body: { label?: string; temp?: "HOT" | "ICED" | "ANY"; sortOrder?: number; isActive?: boolean }): Promise<MenuItemSize> {
    return apiFetch(`/admin/items/${itemId}/sizes/${sizeId}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  deleteItemSize(itemId: string, sizeId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/admin/items/${itemId}/sizes/${sizeId}`, { method: "DELETE" });
  },
  putItemOptionGroups(itemId: string, groupIds: string[]): Promise<{ optionGroupLinks: MenuItemOptionGroupLink[] }> {
    return apiFetch(`/admin/items/${itemId}/option-groups`, {
      method: "PUT",
      body: JSON.stringify({ groupIds }),
    });
  },

  putRecipe(
    itemId: string,
    lines: { ingredientId: string; qtyPerItem: number; unitCode: string }[],
    sizeLines?: {
      ingredientId: string;
      baseType: DrinkMode;
      sizeCode: string;
      qtyPerItem: number;
      unitCode: string;
    }[]
  ): Promise<{ lines: RecipeLine[]; sizeLines?: RecipeLineSize[] }> {
    const body: any = { lines };
    if (sizeLines && sizeLines.length > 0) {
      body.sizeLines = sizeLines;
    }
    return apiFetch(`/admin/items/${itemId}/recipe`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  getRecipe(itemId: string): Promise<{ lines: RecipeLine[]; sizeLines?: RecipeLineSize[] }> {
    return apiFetch(`/admin/items/${itemId}/recipe`);
  },

  getMenuSizes(): Promise<{
    sizes: MenuSize[];
    availability: { ICED: string[]; HOT: string[]; CONCENTRATED: string[] };
    variants: MenuSizeVariant[];
  }> {
    return apiFetch("/admin/menu-settings/sizes");
  },
  updateMenuSizeAvailability(body: {
    availability: { ICED: string[]; HOT: string[]; CONCENTRATED: string[] };
  }): Promise<{ ok: boolean }> {
    return apiFetch("/admin/menu-settings/sizes/availability", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  createMenuSize(body: { label: string; sortOrder?: number }): Promise<MenuSize> {
    return apiFetch("/admin/menu-settings/sizes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patchMenuSize(
    id: string,
    body: { label?: string; imageUrl?: string | null; sortOrder?: number; isActive?: boolean }
  ): Promise<MenuSize> {
    return apiFetch(`/admin/menu-settings/sizes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deleteMenuSize(id: string): Promise<void> {
    return apiFetch(`/admin/menu-settings/sizes/${id}`, {
      method: "DELETE",
    });
  },
  getShotPricingRules(): Promise<{
    rules: { id: string; name: string; shotsPerBundle: number; priceCentsPerBundle: number; isActive: boolean; sortOrder: number }[];
    activeRule: { id: string; name: string; shotsPerBundle: number; priceCentsPerBundle: number; isActive: boolean } | null;
  }> {
    return apiFetch("/admin/menu-settings/shots");
  },
  createShotPricingRule(body: {
    name?: string;
    shotsPerBundle: number;
    priceCentsPerBundle: number;
    isActive?: boolean;
  }): Promise<{ id: string; name: string; shotsPerBundle: number; priceCentsPerBundle: number; isActive: boolean }> {
    return apiFetch("/admin/menu-settings/shots", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patchShotPricingRule(
    id: string,
    body: { name?: string; shotsPerBundle?: number; priceCentsPerBundle?: number; isActive?: boolean }
  ): Promise<{ id: string; name: string; shotsPerBundle: number; priceCentsPerBundle: number; isActive: boolean }> {
    return apiFetch(`/admin/menu-settings/shots/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  getTransactionTypes(): Promise<
    { id: string; code: string; label: string; priceDeltaCents: number; isActive: boolean; sortOrder: number }[]
  > {
    return apiFetch("/admin/menu-settings/transaction-types");
  },
  createTransactionType(body: {
    label: string;
    priceDeltaCents?: number;
    isActive?: boolean;
  }): Promise<{ id: string; code: string; label: string; priceDeltaCents: number; isActive: boolean }> {
    return apiFetch("/admin/menu-settings/transaction-types", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patchTransactionType(
    id: string,
    body: { label?: string; priceDeltaCents?: number; isActive?: boolean; sortOrder?: number }
  ): Promise<{ id: string; code: string; label: string; priceDeltaCents: number; isActive: boolean }> {
    return apiFetch(`/admin/menu-settings/transaction-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  async uploadMenuSizeVariantImage(variantId: string, file: File): Promise<{ imageUrl: string }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("cloud_token") : null;
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${API}/admin/menu-settings/sizes/availability/${variantId}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data?.message || data?.error) ? String(data.message || data.error) : `Upload failed (${r.status})`);
    return data;
  },
  getInventoryStock(): Promise<InventoryStockRow[]> {
    return apiFetch("/admin/inventory/stock");
  },
  getInventoryLocations(): Promise<InventoryLocation[]> {
    return apiFetch("/admin/inventory/locations");
  },
  getIngredients(): Promise<Ingredient[]> {
    return apiFetch("/admin/ingredients");
  },

  getIngredientCategories(): Promise<IngredientCategory[]> {
    return apiFetch("/admin/ingredient-categories");
  },
  createIngredientCategory(body: { name: string }): Promise<IngredientCategory> {
    return apiFetch("/admin/ingredient-categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  deleteIngredientCategory(id: string): Promise<void> {
    return apiFetch(`/admin/ingredient-categories/${id}`, { method: "DELETE" });
  },

  reorderIngredients(order: { id: string; sortOrder: number }[]): Promise<{ ok: boolean }> {
    return apiFetch("/admin/ingredients/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    });
  },

  createIngredient(body: {
    name: string;
    unitCode: string;
    isActive?: boolean;
    categoryId?: string | null;
  }): Promise<Ingredient> {
    return apiFetch("/admin/ingredients", {
      method: "POST",
      body: JSON.stringify({ ...body, isActive: body.isActive ?? true }),
    });
  },

  patchIngredient(
    id: string,
    body: { name?: string; unitCode?: string; isActive?: boolean; categoryId?: string | null }
  ): Promise<Ingredient> {
    return apiFetch(`/admin/ingredients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async uploadIngredientImage(id: string, file: File): Promise<{ imageUrl: string }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("cloud_token") : null;
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${API}/admin/ingredients/${id}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data?.message || data?.error) ? String(data.message || data.error) : `Upload failed (${r.status})`);
    return data;
  },
};

export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem("cloud_token", token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem("cloud_token");
}

export function isAuthenticated(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("cloud_token");
}

export { API };
