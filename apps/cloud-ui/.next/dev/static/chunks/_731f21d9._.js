(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/cloud-ui/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API = ("TURBOPACK compile-time value", "http://localhost:4000") || "http://localhost:4000";
async function apiFetch(path, options = {}) {
    const token = ("TURBOPACK compile-time truthy", 1) ? localStorage.getItem("cloud_token") : "TURBOPACK unreachable";
    const method = (options.method || "GET").toUpperCase();
    const hasBody = options.body !== undefined && options.body !== null && options.body !== "";
    const headers = {
        ...options.headers || {}
    };
    if (hasBody) {
        headers["Content-Type"] = "application/json";
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
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
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.removeItem("cloud_token");
            window.location.href = "/login";
        }
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
        const token = ("TURBOPACK compile-time truthy", 1) ? localStorage.getItem("cloud_token") : "TURBOPACK unreachable";
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API}/admin/items/${id}/image`, {
            method: "POST",
            headers: token ? {
                Authorization: `Bearer ${token}`
            } : {},
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
    cleanupLegacySizes () {
        return apiFetch("/admin/cleanup-legacy-sizes", {
            method: "POST"
        });
    },
    getIngredients () {
        return apiFetch("/admin/ingredients");
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
        const token = ("TURBOPACK compile-time truthy", 1) ? localStorage.getItem("cloud_token") : "TURBOPACK unreachable";
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API}/admin/ingredients/${id}/image`, {
            method: "POST",
            headers: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            body: form
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || data?.error ? String(data.message || data.error) : `Upload failed (${r.status})`);
        return data;
    }
};
function setToken(token) {
    if ("TURBOPACK compile-time truthy", 1) localStorage.setItem("cloud_token", token);
}
function clearToken() {
    if ("TURBOPACK compile-time truthy", 1) localStorage.removeItem("cloud_token");
}
function isAuthenticated() {
    return ("TURBOPACK compile-time value", "object") !== "undefined" && !!localStorage.getItem("cloud_token");
}
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/cloud-ui/src/app/login/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function LoginPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        console.log("API URL:", __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API"]);
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password
                })
            });
            if (data && typeof data === "object" && "token" in data && data.token) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(data.token);
                router.replace("/menu");
            } else {
                setError((data && typeof data === "object" && "error" in data ? data.error : null) || "Login failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally{
            setLoading(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen items-center justify-center p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            className: "w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "mb-4 text-xl font-semibold",
                    children: "Cloud Admin"
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                    lineNumber: 46,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            htmlFor: "email",
                            className: "mb-1 block text-sm font-medium text-gray-700",
                            children: "Email"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                            lineNumber: 48,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            id: "email",
                            type: "email",
                            value: email,
                            onChange: (e)=>setEmail(e.target.value),
                            required: true,
                            className: "w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                    lineNumber: 47,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            htmlFor: "password",
                            className: "mb-1 block text-sm font-medium text-gray-700",
                            children: "Password"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            id: "password",
                            type: "password",
                            value: password,
                            onChange: (e)=>setPassword(e.target.value),
                            required: true,
                            className: "w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                            lineNumber: 64,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                    lineNumber: 60,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mb-3 text-sm text-red-600",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                    lineNumber: 73,
                    columnNumber: 19
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "submit",
                    disabled: loading,
                    className: "w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50",
                    children: loading ? "Signing in…" : "Sign in"
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
                    lineNumber: 74,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
            lineNumber: 42,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/app/login/page.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this);
}
_s(LoginPage, "ERXCO/WGzQRGoxQKVRn54p92PMY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = LoginPage;
var _c;
__turbopack_context__.k.register(_c, "LoginPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_731f21d9._.js.map