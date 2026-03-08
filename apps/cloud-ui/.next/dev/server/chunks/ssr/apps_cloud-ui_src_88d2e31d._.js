module.exports = [
"[project]/apps/cloud-ui/src/lib/theme.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Utak / POS style theme (shared with admin Items layout)
__turbopack_context__.s([
    "COLORS",
    ()=>COLORS
]);
const COLORS = {
    primary: "#C9A227",
    primaryDark: "#A8841F",
    bgDark: "#1f1f1f",
    bgDarker: "#0a0a0a",
    bgPanel: "#2a2a2a",
    borderDark: "#2a2a2a",
    borderLight: "#3a3a3a"
};
}),
"[project]/apps/cloud-ui/src/app/items/ItemsList.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ItemsList",
    ()=>ItemsList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/theme.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const API_URL = ("TURBOPACK compile-time value", "http://localhost:4000") || "http://localhost:4000";
const TOAST_KEY = "items_toast";
const TILE_COLORS = [
    {
        border: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary,
        accent: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
    },
    {
        border: "#10b981",
        accent: "#10b981"
    },
    {
        border: "#f59e0b",
        accent: "#f59e0b"
    },
    {
        border: "#ef4444",
        accent: "#ef4444"
    },
    {
        border: "#8b5cf6",
        accent: "#8b5cf6"
    },
    {
        border: "#ec4899",
        accent: "#ec4899"
    }
];
function formatPesos(cents) {
    return `₱${(cents / 100).toFixed(2)}`;
}
function ItemsList() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [success, setSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [includeDeleted, setIncludeDeleted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(searchParams.get("includeDeleted") === "1");
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("items");
    const [selectedCategoryId, setSelectedCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedSubCategoryId, setSelectedSubCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const safeCategories = Array.isArray(categories) ? categories : [];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const msg = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(TOAST_KEY) : null;
        if (msg) {
            sessionStorage.removeItem(TOAST_KEY);
            setSuccess(msg);
            const t = setTimeout(()=>setSuccess(""), 3000);
            return ()=>clearTimeout(t);
        }
    }, []);
    function refresh() {
        setLoading(true);
        Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].getCategories(),
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].getItems(includeDeleted)
        ]).then(([cats, its])=>{
            setCategories(Array.isArray(cats) ? cats : []);
            setItems(Array.isArray(its) ? its : []);
        }).catch((e)=>{
            setError(e instanceof Error ? e.message : "Failed to load");
            setCategories([]);
            setItems([]);
        }).finally(()=>setLoading(false));
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setIncludeDeleted(searchParams.get("includeDeleted") === "1");
    }, [
        searchParams
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refresh();
    }, [
        includeDeleted
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (safeCategories.length > 0 && !selectedCategoryId && (viewMode === "items" || viewMode === "subcategories")) {
            setSelectedCategoryId(safeCategories[0].id);
        }
    }, [
        safeCategories.length,
        selectedCategoryId,
        viewMode
    ]);
    function handleCategoryChange(categoryId) {
        setSelectedCategoryId(categoryId);
        setSelectedSubCategoryId(null);
    }
    function handleSubcategoryClick(sub) {
        setSelectedSubCategoryId(sub.id);
    }
    function handleBackToTiles() {
        setSelectedSubCategoryId(null);
    }
    async function handleDeleteItem(item) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        setError("");
        setSuccess("");
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].deleteItem(item.id);
            setSuccess("Item deleted");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete");
        }
    }
    async function handleRestoreItem(item) {
        if (!confirm(`Restore "${item.name}"?`)) return;
        setError("");
        setSuccess("");
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].restoreItem(item.id);
            setSuccess("Item restored");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to restore");
        }
    }
    async function handleDeleteCategory(cat) {
        if (!confirm(`Delete category "${cat.name}"?`)) return;
        setError("");
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].deleteCategory(cat.id);
            if (selectedCategoryId === cat.id) {
                setSelectedCategoryId(null);
                setSelectedSubCategoryId(null);
            }
            refresh();
        } catch (err) {
            const body = err?.body;
            if (body?.error === "CATEGORY_NOT_EMPTY") {
                setError("Cannot delete: category has subcategories. Delete or move them first.");
            } else {
                setError(err instanceof Error ? err.message : "Failed");
            }
        }
    }
    async function handleDeleteSubCategory(sub) {
        if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
        setError("");
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].deleteSubCategory(sub.id);
            if (selectedSubCategoryId === sub.id) {
                setSelectedSubCategoryId(null);
            }
            refresh();
        } catch (err) {
            const body = err?.body;
            if (body?.error === "SUBCATEGORY_NOT_EMPTY") {
                setError("Cannot delete: subcategory has items. Delete or move them first.");
            } else {
                setError(err instanceof Error ? err.message : "Failed");
            }
        }
    }
    const currentCategory = safeCategories.find((c)=>c.id === selectedCategoryId);
    const subcategories = currentCategory ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeSubCategories"])(currentCategory.subCategories) : [];
    const filteredItems = selectedSubCategoryId && viewMode === "items" ? items.filter((i)=>i.subCategoryId === selectedSubCategoryId) : [];
    const selectedSubcategory = subcategories.find((s)=>s.id === selectedSubCategoryId);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded border bg-gray-50 p-8 text-center text-gray-600",
            children: "Loading…"
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
            lineNumber: 190,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col overflow-hidden rounded-lg border border-gray-200",
        style: {
            minHeight: 400,
            background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDark
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center justify-between gap-3 px-4 py-2",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDarker,
                    borderBottom: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderDark}`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex rounded border",
                                style: {
                                    borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight
                                },
                                children: [
                                    "items",
                                    "categories",
                                    "subcategories"
                                ].map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>{
                                            setViewMode(m);
                                            if (m === "items") {
                                                setSelectedSubCategoryId(null);
                                            }
                                        },
                                        style: {
                                            padding: "8px 16px",
                                            fontSize: 13,
                                            fontWeight: viewMode === m ? "600" : "normal",
                                            background: viewMode === m ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            textTransform: "capitalize"
                                        },
                                        children: m
                                    }, m, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 209,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 207,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex cursor-pointer items-center gap-2 text-sm",
                                style: {
                                    color: "#aaa"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: includeDeleted,
                                        onChange: (e)=>{
                                            const v = e.target.checked;
                                            setIncludeDeleted(v);
                                            const url = new URL(window.location.href);
                                            if (v) url.searchParams.set("includeDeleted", "1");
                                            else url.searchParams.delete("includeDeleted");
                                            router.replace(url.pathname + url.search, {
                                                scroll: false
                                            });
                                        },
                                        className: "rounded"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 237,
                                        columnNumber: 13
                                    }, this),
                                    "Show deleted"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this),
                    success && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm",
                        style: {
                            color: "#22c55e"
                        },
                        children: success
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 253,
                        columnNumber: 21
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm",
                        style: {
                            color: "#ef4444"
                        },
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 254,
                        columnNumber: 19
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                lineNumber: 202,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "overflow-x-auto px-4 py-3",
                style: {
                    borderBottom: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderDark}`,
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDarker
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-2",
                    children: safeCategories.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: "#666",
                            fontSize: 14,
                            margin: 0
                        },
                        children: [
                            "No categories. Create them in ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/categories",
                                className: "underline",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                },
                                children: "Categories"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 265,
                                columnNumber: 45
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 264,
                        columnNumber: 13
                    }, this) : safeCategories.map((cat)=>{
                        const isSelected = selectedCategoryId === cat.id;
                        const isCategoriesMode = viewMode === "categories";
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative flex items-center gap-2 shrink-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>handleCategoryChange(cat.id),
                                    style: {
                                        padding: "10px 20px",
                                        fontSize: 14,
                                        fontWeight: isSelected ? "bold" : "normal",
                                        background: isSelected ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                        color: "#fff",
                                        border: isSelected ? `2px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary}` : `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        transition: "all 0.2s"
                                    },
                                    children: cat.name
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                    lineNumber: 273,
                                    columnNumber: 19
                                }, this),
                                viewMode === "categories" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>handleDeleteCategory(cat),
                                    className: "rounded px-2 py-0.5 text-xs text-white",
                                    style: {
                                        background: "#ef4444"
                                    },
                                    children: "Delete"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                    lineNumber: 296,
                                    columnNumber: 21
                                }, this)
                            ]
                        }, cat.id, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                            lineNumber: 272,
                            columnNumber: 17
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                    lineNumber: 262,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                lineNumber: 258,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-auto p-5",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDark
                },
                children: viewMode === "categories" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center",
                    style: {
                        color: "#666"
                    },
                    children: [
                        "Select a category above to Edit or Delete. Manage subcategories in",
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: "/categories",
                            className: "underline",
                            style: {
                                color: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                            },
                            children: "Categories"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                            lineNumber: 320,
                            columnNumber: 13
                        }, this),
                        "."
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                    lineNumber: 318,
                    columnNumber: 11
                }, this) : viewMode === "subcategories" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: !currentCategory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: "#666"
                        },
                        children: "Select a category to manage its subcategories."
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 328,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-4",
                        style: {
                            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                            maxWidth: 900
                        },
                        children: [
                            subcategories.map((sub, index)=>{
                                const colors = TILE_COLORS[index % TILE_COLORS.length];
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col items-center justify-between rounded-lg p-4",
                                    style: {
                                        background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                        border: `2px solid ${colors.border}`,
                                        minHeight: 100
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-center font-semibold uppercase",
                                            style: {
                                                color: "#fff",
                                                letterSpacing: "0.5px"
                                            },
                                            children: sub.name
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                            lineNumber: 349,
                                            columnNumber: 23
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-2 flex gap-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>handleDeleteSubCategory(sub),
                                                className: "rounded px-2 py-1 text-xs text-white",
                                                style: {
                                                    background: "#ef4444"
                                                },
                                                children: "Delete"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 356,
                                                columnNumber: 25
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                            lineNumber: 355,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, sub.id, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                    lineNumber: 340,
                                    columnNumber: 21
                                }, this);
                            }),
                            subcategories.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    color: "#666"
                                },
                                children: [
                                    "No subcategories. Add them in ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/categories",
                                        className: "underline",
                                        style: {
                                            color: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                        },
                                        children: "Categories"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 370,
                                        columnNumber: 51
                                    }, this),
                                    "."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 369,
                                columnNumber: 19
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 330,
                        columnNumber: 15
                    }, this)
                }, void 0, false) : viewMode === "items" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: !currentCategory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: "#666"
                        },
                        children: "Select a category to view subcategories."
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 379,
                        columnNumber: 15
                    }, this) : selectedSubCategoryId && selectedSubcategory ? /* Items view */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: handleBackToTiles,
                                className: "mb-4 flex items-center gap-2 rounded px-4 py-2 text-sm",
                                style: {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                    color: "#fff",
                                    border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`
                                },
                                children: "← Back to Subcategories"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 383,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "border-b pb-2 text-sm font-semibold uppercase tracking-wide",
                                        style: {
                                            color: "#ddd",
                                            borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                        },
                                        children: selectedSubcategory.name
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 397,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/items/new?subCategoryId=${selectedSubCategoryId}`,
                                        className: "rounded px-4 py-2 text-sm font-medium text-white",
                                        style: {
                                            background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                        },
                                        children: "Create Item"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 406,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 396,
                                columnNumber: 17
                            }, this),
                            filteredItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "py-8 text-center",
                                style: {
                                    color: "#666"
                                },
                                children: "No items in this subcategory."
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 416,
                                columnNumber: 19
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-3",
                                style: {
                                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))"
                                },
                                children: filteredItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "group flex flex-col rounded-lg border-2 p-3 transition-colors",
                                        style: {
                                            background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                            borderColor: item.deletedAt ? "#444" : "#3a3a3a",
                                            opacity: item.deletedAt ? 0.75 : 1
                                        },
                                        children: [
                                            item.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: item.imageUrl.startsWith("http") ? item.imageUrl : `${API_URL}${item.imageUrl}`,
                                                alt: "",
                                                className: "mb-2 h-20 w-full rounded object-cover"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 437,
                                                columnNumber: 27
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mb-2 flex h-20 w-full items-center justify-center rounded text-xs",
                                                style: {
                                                    background: "#333",
                                                    color: "#666"
                                                },
                                                children: "No image"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 447,
                                                columnNumber: 27
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "font-semibold",
                                                style: {
                                                    color: "#fff",
                                                    fontSize: 14
                                                },
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 454,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm",
                                                style: {
                                                    color: "#4ade80",
                                                    fontWeight: 600
                                                },
                                                children: formatPesos(item.priceCents)
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 460,
                                                columnNumber: 25
                                            }, this),
                                            item.deletedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "mt-1 text-xs",
                                                style: {
                                                    color: "#ef4444"
                                                },
                                                children: "Deleted"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 467,
                                                columnNumber: 27
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-2 flex gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: item.deletedAt ? `/items/${item.id}?includeDeleted=1` : `/items/${item.id}`,
                                                        className: "text-xs underline",
                                                        style: {
                                                            color: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                                        },
                                                        children: "Edit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                        lineNumber: 472,
                                                        columnNumber: 27
                                                    }, this),
                                                    item.deletedAt ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>handleRestoreItem(item),
                                                        className: "text-xs underline",
                                                        style: {
                                                            color: "#22c55e"
                                                        },
                                                        children: "Restore"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 29
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>handleDeleteItem(item),
                                                        className: "text-xs underline",
                                                        style: {
                                                            color: "#ef4444"
                                                        },
                                                        children: "Delete"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                        lineNumber: 493,
                                                        columnNumber: 29
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                                lineNumber: 471,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 427,
                                        columnNumber: 23
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 420,
                                columnNumber: 19
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 382,
                        columnNumber: 15
                    }, this) : /* Subcategory tiles grid */ subcategories.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-4",
                        style: {
                            gridTemplateColumns: "repeat(3, 1fr)",
                            maxWidth: 900
                        },
                        children: subcategories.map((sub, index)=>{
                            const colors = TILE_COLORS[index % TILE_COLORS.length];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>handleSubcategoryClick(sub),
                                className: "flex min-h-[120px] flex-col items-center justify-center rounded-lg p-4 transition-all hover:-translate-y-0.5",
                                style: {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                    border: `2px solid ${colors.border}`
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-3 text-center text-sm font-bold uppercase tracking-wide",
                                        style: {
                                            color: "#fff",
                                            lineHeight: 1.3
                                        },
                                        children: sub.name
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 531,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-0.5 w-10 rounded",
                                        style: {
                                            background: colors.accent
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                        lineNumber: 537,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, sub.id, true, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 521,
                                columnNumber: 23
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 511,
                        columnNumber: 17
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: "#666"
                        },
                        children: [
                            "No subcategories. Add them in ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/categories",
                                className: "underline",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                },
                                children: "Categories"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                                lineNumber: 547,
                                columnNumber: 49
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                        lineNumber: 546,
                        columnNumber: 17
                    }, this)
                }, void 0, false) : null
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
                lineNumber: 313,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/cloud-ui/src/app/items/ItemsList.tsx",
        lineNumber: 197,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=apps_cloud-ui_src_88d2e31d._.js.map