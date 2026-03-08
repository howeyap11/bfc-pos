module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/apps/cloud-ui/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API",
    ()=>API,
    "api",
    ()=>api,
    "apiFetch",
    ()=>apiFetch,
    "clearToken",
    ()=>clearToken,
    "isAuthenticated",
    ()=>isAuthenticated,
    "normalizeCategoriesResponse",
    ()=>normalizeCategoriesResponse,
    "normalizeSubCategories",
    ()=>normalizeSubCategories,
    "setToken",
    ()=>setToken
]);
const API = ("TURBOPACK compile-time value", "http://localhost:4000") || "http://localhost:4000";
async function apiFetch(path, options = {}) {
    const token = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
    const method = (options.method || "GET").toUpperCase();
    const hasBody = options.body !== undefined && options.body !== null && options.body !== "";
    const headers = {
        ...options.headers || {}
    };
    if (hasBody) {
        headers["Content-Type"] = "application/json";
    }
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const url = `${API}${path.startsWith("/") ? path : `/${path}`}`;
    const fetchOptions = {
        ...options,
        headers,
        // Do not send credentials/cookies - we use Bearer token to avoid CORS preflight issues
        credentials: "omit"
    };
    let res;
    try {
        res = await fetch(url, fetchOptions);
    } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        const isNetwork = /failed to fetch|network error|load failed/i.test(msg);
        console.error("[apiFetch] Network error:", {
            url,
            method,
            error: msg,
            cause: fetchErr instanceof Error ? fetchErr.cause : undefined
        });
        throw new Error(isNetwork ? "Network error. Check if the API is running and reachable." : msg);
    }
    if (res.status === 401) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }
    if (res.status === 204) return {};
    let data;
    try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
    } catch  {
        console.error("[apiFetch] Invalid JSON response:", {
            url,
            method,
            status: res.status
        });
        throw new Error(`Invalid response (${res.status})`);
    }
    if (res.status >= 400) {
        const errMsg = data && typeof data === "object" && data.message || data && typeof data === "object" && data.error || `Request failed (${res.status})`;
        const err = new Error(String(errMsg));
        err.status = res.status;
        err.body = data;
        throw err;
    }
    return data;
}
function normalizeCategoriesResponse(raw) {
    if (Array.isArray(raw)) {
        return {
            categories: raw
        };
    }
    if (raw && typeof raw === "object") {
        const obj = raw;
        if (Array.isArray(obj.categories)) {
            return {
                categories: obj.categories
            };
        }
        if (Array.isArray(obj.data)) {
            return {
                categories: obj.data
            };
        }
    }
    return {
        categories: [],
        debugError: `Unexpected categories response: ${JSON.stringify(raw)}`
    };
}
function normalizeSubCategories(subCategories) {
    if (Array.isArray(subCategories)) return subCategories;
    return [];
}
const api = {
    getItems (includeDeleted) {
        const qs = includeDeleted ? "?includeDeleted=1" : "";
        return apiFetch(`/admin/items${qs}`);
    },
    getItem (id, includeDeleted) {
        const qs = includeDeleted ? "?includeDeleted=1" : "";
        return apiFetch(`/admin/items/${id}${qs}`);
    },
    restoreItem (id) {
        return apiFetch(`/admin/items/${id}/restore`, {
            method: "POST"
        });
    },
    getDrinkSizes () {
        return apiFetch("/admin/drink-sizes");
    },
    putItemDrinkSizes (itemId, body) {
        return apiFetch(`/admin/items/${itemId}/drink-sizes`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    },
    createItem (body) {
        return apiFetch("/admin/items", {
            method: "POST",
            body: JSON.stringify({
                ...body,
                isActive: body.isActive ?? true,
                subCategoryId: body.subCategoryId
            })
        });
    },
    deleteItem (id) {
        return apiFetch(`/admin/items/${id}`, {
            method: "DELETE"
        });
    },
    updateItem (id, body) {
        return apiFetch(`/admin/items/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    async uploadItemImage (id, file) {
        const token = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API}/admin/items/${id}/image`, {
            method: "POST",
            headers: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : {},
            body: form
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || data?.error ? String(data.message || data.error) : `Upload failed (${r.status})`);
        return data;
    },
    async getCategories () {
        const raw = await apiFetch("/admin/categories");
        return normalizeCategoriesResponse(raw).categories;
    },
    /** Fetch categories with debug info when response is unexpected. Use for debugging. */ async getCategoriesWithDebug () {
        const raw = await apiFetch("/admin/categories");
        return normalizeCategoriesResponse(raw);
    },
    createCategory (body) {
        return apiFetch("/admin/categories", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchCategory (id, body) {
        return apiFetch(`/admin/categories/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    deleteCategory (id) {
        return apiFetch(`/admin/categories/${id}`, {
            method: "DELETE"
        });
    },
    createSubCategory (body) {
        return apiFetch("/admin/subcategories", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    createSubCategoryByCategory (categoryId, body) {
        return apiFetch(`/admin/categories/${categoryId}/subcategories`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchSubCategory (id, body) {
        return apiFetch(`/admin/subcategories/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    deleteSubCategory (id) {
        return apiFetch(`/admin/subcategories/${id}`, {
            method: "DELETE"
        });
    },
    getOptionGroups () {
        return apiFetch("/admin/option-groups");
    },
    /** Modifier sections only (isSizeGroup=false). For Menu Settings → Modifiers. */ getModifierGroups () {
        return apiFetch("/admin/option-groups").then((groups)=>(groups ?? []).filter((g)=>!g.isSizeGroup));
    },
    createOptionGroup (body) {
        return apiFetch("/admin/option-groups", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchOptionGroup (id, body) {
        return apiFetch(`/admin/option-groups/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    deleteOptionGroup (id) {
        return apiFetch(`/admin/option-groups/${id}`, {
            method: "DELETE"
        });
    },
    addOption (groupId, body) {
        return apiFetch(`/admin/option-groups/${groupId}/options`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    deleteOption (groupId, optionId) {
        return apiFetch(`/admin/option-groups/${groupId}/options/${optionId}`, {
            method: "DELETE"
        });
    },
    getItemSizes (itemId) {
        return apiFetch(`/admin/items/${itemId}/sizes`);
    },
    createItemSize (itemId, body) {
        return apiFetch(`/admin/items/${itemId}/sizes`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    updateItemSize (itemId, sizeId, body) {
        return apiFetch(`/admin/items/${itemId}/sizes/${sizeId}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    deleteItemSize (itemId, sizeId) {
        return apiFetch(`/admin/items/${itemId}/sizes/${sizeId}`, {
            method: "DELETE"
        });
    },
    putItemOptionGroups (itemId, groupIds) {
        return apiFetch(`/admin/items/${itemId}/option-groups`, {
            method: "PUT",
            body: JSON.stringify({
                groupIds
            })
        });
    },
    putRecipe (itemId, lines, sizeLines) {
        const body = {
            lines
        };
        if (sizeLines && sizeLines.length > 0) {
            body.sizeLines = sizeLines;
        }
        return apiFetch(`/admin/items/${itemId}/recipe`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    },
    getRecipe (itemId) {
        return apiFetch(`/admin/items/${itemId}/recipe`);
    },
    getMenuSizes () {
        return apiFetch("/admin/menu-settings/sizes");
    },
    updateMenuSizeAvailability (body) {
        return apiFetch("/admin/menu-settings/sizes/availability", {
            method: "PUT",
            body: JSON.stringify(body)
        });
    },
    createMenuSize (body) {
        return apiFetch("/admin/menu-settings/sizes", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchMenuSize (id, body) {
        return apiFetch(`/admin/menu-settings/sizes/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    deleteMenuSize (id) {
        return apiFetch(`/admin/menu-settings/sizes/${id}`, {
            method: "DELETE"
        });
    },
    getShotPricingRules () {
        return apiFetch("/admin/menu-settings/shots");
    },
    createShotPricingRule (body) {
        return apiFetch("/admin/menu-settings/shots", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchShotPricingRule (id, body) {
        return apiFetch(`/admin/menu-settings/shots/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    getTransactionTypes () {
        return apiFetch("/admin/menu-settings/transaction-types");
    },
    createTransactionType (body) {
        return apiFetch("/admin/menu-settings/transaction-types", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    patchTransactionType (id, body) {
        return apiFetch(`/admin/menu-settings/transaction-types/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    async uploadMenuSizeVariantImage (variantId, file) {
        const token = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API}/admin/menu-settings/sizes/availability/${variantId}/image`, {
            method: "POST",
            headers: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : {},
            body: form
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || data?.error ? String(data.message || data.error) : `Upload failed (${r.status})`);
        return data;
    },
    getInventoryStock () {
        return apiFetch("/admin/inventory/stock");
    },
    getInventoryLocations () {
        return apiFetch("/admin/inventory/locations");
    },
    getIngredients () {
        return apiFetch("/admin/ingredients");
    },
    getIngredientCategories () {
        return apiFetch("/admin/ingredient-categories");
    },
    createIngredientCategory (body) {
        return apiFetch("/admin/ingredient-categories", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    deleteIngredientCategory (id) {
        return apiFetch(`/admin/ingredient-categories/${id}`, {
            method: "DELETE"
        });
    },
    reorderIngredients (order) {
        return apiFetch("/admin/ingredients/reorder", {
            method: "POST",
            body: JSON.stringify({
                order
            })
        });
    },
    createIngredient (body) {
        return apiFetch("/admin/ingredients", {
            method: "POST",
            body: JSON.stringify({
                ...body,
                isActive: body.isActive ?? true
            })
        });
    },
    patchIngredient (id, body) {
        return apiFetch(`/admin/ingredients/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },
    async uploadIngredientImage (id, file) {
        const token = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API}/admin/ingredients/${id}/image`, {
            method: "POST",
            headers: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : {},
            body: form
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || data?.error ? String(data.message || data.error) : `Upload failed (${r.status})`);
        return data;
    }
};
function setToken(token) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
}
function clearToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
}
function isAuthenticated() {
    return ("TURBOPACK compile-time value", "undefined") !== "undefined" && !!localStorage.getItem("cloud_token");
}
;
}),
"[project]/apps/cloud-ui/src/components/AuthGuard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthGuard",
    ()=>AuthGuard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function AuthGuard({ children }) {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAuthenticated"])()) router.replace("/login");
    }, [
        router
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
}),
"[project]/apps/cloud-ui/src/components/DashboardNav.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DashboardNav",
    ()=>DashboardNav
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const nav = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: IconGrid
    },
    {
        href: "/transactions",
        label: "Transactions",
        icon: IconReceipt
    },
    {
        href: "/ingredients",
        label: "Ingredients",
        icon: IconFlask
    },
    {
        href: "/inventory",
        label: "Inventory",
        icon: IconPackage
    },
    {
        href: "/menu",
        label: "Menu",
        icon: IconMenu
    },
    {
        href: "/menu-settings/sizes",
        label: "Menu Settings",
        icon: IconSettings
    },
    {
        href: "/reports",
        label: "Reports",
        icon: IconChart
    }
];
function IconGrid({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
function IconReceipt({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 27,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
function IconFlask({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 34,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
function IconPackage({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 41,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
function IconMenu({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M4 6h16M4 12h16M4 18h16"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 48,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
function IconSettings({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
function IconChart({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 63,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
function IconLogout({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 70,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
function DashboardNav() {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    function isActive(href) {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname === href || pathname.startsWith(href + "/");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: "fixed left-0 top-0 z-10 flex h-screen w-56 flex-col p-3",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-1 flex-col rounded-2xl shadow-lg",
            style: {
                background: "linear-gradient(180deg, #2c2c2c 0%, #1f1f1f 100%)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-14 items-center px-5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-semibold text-white/95",
                        children: "Cloud Admin"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                        lineNumber: 92,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                    lineNumber: 91,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                    className: "flex-1 space-y-1 overflow-y-auto px-2 py-3",
                    children: nav.map(({ href, label, icon: Icon })=>{
                        const active = isActive(href);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: href,
                            className: `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-emerald-500/30 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                    className: "h-5 w-5 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                                    lineNumber: 107,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: label
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                                    lineNumber: 108,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, href, true, {
                            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                            lineNumber: 98,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                    lineNumber: 94,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border-t border-white/10 px-2 py-3",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearToken"])();
                            window.location.href = "/login";
                        },
                        className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(IconLogout, {
                                className: "h-5 w-5 flex-shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                                lineNumber: 122,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Logout"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                                lineNumber: 123,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                        lineNumber: 114,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
                    lineNumber: 113,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
            lineNumber: 85,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/DashboardNav.tsx",
        lineNumber: 84,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3101bd21._.js.map