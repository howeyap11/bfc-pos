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
"[project]/apps/cloud-ui/src/app/menu/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MenuPage
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
function slugFromName(name) {
    return name.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function formatPesos(cents) {
    return `₱${(cents / 100).toFixed(2)}`;
}
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
function MenuPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [success, setSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [includeDeleted, setIncludeDeleted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(searchParams.get("includeDeleted") === "1");
    const [selectedCategoryId, setSelectedCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedSubCategoryId, setSelectedSubCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [addCategoryName, setAddCategoryName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [showAddCategoryModal, setShowAddCategoryModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [addSubName, setAddSubName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [showAddSubcategoryModal, setShowAddSubcategoryModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editCategoryId, setEditCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editCategoryName, setEditCategoryName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editCategorySlug, setEditCategorySlug] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editSubId, setEditSubId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editSubName, setEditSubName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [draggingCategoryId, setDraggingCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dragOverCategoryId, setDragOverCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [draggingSubCategoryId, setDraggingSubCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dragOverSubCategoryId, setDragOverSubCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [draggingItemId, setDraggingItemId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dragOverItemId, setDragOverItemId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const safeCategories = Array.isArray(categories) ? categories : [];
    const currentCategory = safeCategories.find((c)=>c.id === selectedCategoryId);
    const subcategories = currentCategory ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeSubCategories"])(currentCategory.subCategories) : [];
    const selectedSubcategory = subcategories.find((s)=>s.id === selectedSubCategoryId);
    const filteredItems = selectedSubCategoryId ? items.filter((i)=>i.subCategoryId === selectedSubCategoryId).slice().sort((a, b)=>(a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
    function reorderById(list, fromId, toId) {
        if (fromId === toId) return list;
        const fromIndex = list.findIndex((x)=>x.id === fromId);
        const toIndex = list.findIndex((x)=>x.id === toId);
        if (fromIndex === -1 || toIndex === -1) return list;
        const result = list.slice();
        const [moved] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, moved);
        return result;
    }
    async function persistCategoryOrder(next) {
        setCategories(next);
        try {
            await Promise.all(next.map((cat, index)=>cat.sortOrder !== index ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].patchCategory(cat.id, {
                    sortOrder: index
                }) : Promise.resolve(cat)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder categories");
            refresh();
        }
    }
    async function persistSubCategoryOrder(categoryId, nextSubs) {
        setCategories((prev)=>prev.map((cat)=>cat.id === categoryId ? {
                    ...cat,
                    subCategories: nextSubs
                } : cat));
        try {
            await Promise.all(nextSubs.map((sub, index)=>sub.sortOrder !== index ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].patchSubCategory(sub.id, {
                    sortOrder: index
                }) : Promise.resolve(sub)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder subcategories");
            refresh();
        }
    }
    async function persistItemOrder(subCategoryId, nextItems) {
        setItems((prev)=>{
            const other = prev.filter((i)=>i.subCategoryId !== subCategoryId);
            return [
                ...other,
                ...nextItems
            ];
        });
        try {
            await Promise.all(nextItems.map((it, index)=>(it.sortOrder ?? 0) !== index ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].updateItem(it.id, {
                    sortOrder: index
                }) : Promise.resolve(it)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder items");
            refresh();
        }
    }
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
    const includeDeletedParam = searchParams.get("includeDeleted") === "1";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setIncludeDeleted(includeDeletedParam);
    }, [
        includeDeletedParam
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refresh();
    }, [
        includeDeleted
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (safeCategories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(safeCategories[0].id);
        }
    }, [
        safeCategories.length,
        selectedCategoryId
    ]);
    function selectCategory(id) {
        setSelectedCategoryId(id);
        setSelectedSubCategoryId(null);
    }
    function selectSubcategory(id) {
        setSelectedSubCategoryId(id);
    }
    async function handleAddCategory(e) {
        e.preventDefault();
        if (!addCategoryName.trim()) return;
        setError("");
        setSaving(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].createCategory({
                name: addCategoryName.trim(),
                slug: slugFromName(addCategoryName)
            });
            setAddCategoryName("");
            setShowAddCategoryModal(false);
            setSuccess("Category added");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
        } finally{
            setSaving(false);
        }
    }
    async function handleEditCategory(e) {
        e.preventDefault();
        if (!editCategoryId || !editCategoryName.trim()) return;
        setError("");
        setSaving(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].patchCategory(editCategoryId, {
                name: editCategoryName.trim(),
                slug: editCategorySlug.trim() ? slugFromName(editCategorySlug) : undefined
            });
            setEditCategoryId(null);
            setSuccess("Category updated");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
        } finally{
            setSaving(false);
        }
    }
    async function handleAddSubcategory(e) {
        e.preventDefault();
        if (!selectedCategoryId || !addSubName.trim()) return;
        setError("");
        setSaving(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].createSubCategoryByCategory(selectedCategoryId, {
                name: addSubName.trim()
            });
            setAddSubName("");
            setShowAddSubcategoryModal(false);
            setSuccess("Subcategory added");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
        } finally{
            setSaving(false);
        }
    }
    async function handleEditSubcategory(e) {
        e.preventDefault();
        if (!editSubId || !editSubName.trim()) return;
        setError("");
        setSaving(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].patchSubCategory(editSubId, {
                name: editSubName.trim()
            });
            setEditSubId(null);
            setSuccess("Subcategory updated");
            refresh();
            setTimeout(()=>setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
        } finally{
            setSaving(false);
        }
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
    const inSubcategory = !!selectedSubCategoryId && !!selectedSubcategory;
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-[60vh] items-center justify-center",
            style: {
                background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDark
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    color: "#999"
                },
                children: "Loading…"
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 307,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
            lineNumber: 306,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-[calc(100vh-52px)] flex-col",
        style: {
            background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgDark
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center justify-between gap-2 px-4 py-2",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                    borderBottom: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: [
                            success && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm text-green-400",
                                children: success
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                lineNumber: 320,
                                columnNumber: 23
                            }, this),
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm text-red-400",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                lineNumber: 321,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex items-center gap-1.5 text-sm text-gray-300",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: includeDeleted,
                                        onChange: (e)=>{
                                            const v = e.target.checked;
                                            setIncludeDeleted(v);
                                            const url = new URL(window.location.href);
                                            url.pathname = "/menu";
                                            if (v) url.searchParams.set("includeDeleted", "1");
                                            else url.searchParams.delete("includeDeleted");
                                            router.replace(url.pathname + url.search, {
                                                scroll: false
                                            });
                                        },
                                        className: "rounded"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                        lineNumber: 323,
                                        columnNumber: 13
                                    }, this),
                                    "Show deleted"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                lineNumber: 322,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                        lineNumber: 319,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: inSubcategory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>{
                                        setEditSubId(selectedSubcategory.id);
                                        setEditSubName(selectedSubcategory.name);
                                    },
                                    className: "rounded px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10",
                                    style: {
                                        border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`
                                    },
                                    children: "Edit Subcategory"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 343,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: `/items/new?categoryId=${currentCategory?.id ?? ""}&subCategoryId=${selectedSubCategoryId}`,
                                    className: "rounded px-3 py-1.5 text-sm font-medium text-white",
                                    style: {
                                        background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                    },
                                    children: "Create Item"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 354,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setShowAddCategoryModal(true),
                                    className: "rounded px-3 py-1.5 text-sm text-white",
                                    style: {
                                        background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                    },
                                    children: "Add Category"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 364,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    disabled: !currentCategory,
                                    onClick: ()=>{
                                        if (!currentCategory) return;
                                        setShowAddSubcategoryModal(true);
                                    },
                                    className: "rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50",
                                    style: {
                                        background: "#10b981"
                                    },
                                    children: "Add Subcategory"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 372,
                                    columnNumber: 15
                                }, this),
                                currentCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>{
                                        setEditCategoryId(currentCategory.id);
                                        setEditCategoryName(currentCategory.name);
                                        setEditCategorySlug(currentCategory.slug);
                                    },
                                    className: "rounded px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10",
                                    style: {
                                        border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`
                                    },
                                    children: "Edit Category"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 385,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true)
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                        lineNumber: 340,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 315,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "flex-1 overflow-auto p-4",
                children: !currentCategory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    style: {
                        color: "#888"
                    },
                    children: "Select a category above or add one."
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                    lineNumber: 406,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4 overflow-x-auto pb-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                style: {
                                    minWidth: "min-content"
                                },
                                children: safeCategories.slice().sort((a, b)=>a.sortOrder - b.sortOrder).map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>selectCategory(cat.id),
                                        className: "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                        style: {
                                            background: selectedCategoryId === cat.id ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                            color: selectedCategoryId === cat.id ? "#000" : "#ddd",
                                            border: `1px solid ${selectedCategoryId === cat.id ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight}`
                                        },
                                        children: cat.name
                                    }, cat.id, false, {
                                        fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                        lineNumber: 416,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                lineNumber: 411,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 410,
                            columnNumber: 13
                        }, this),
                        subcategories.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: "#888",
                                marginBottom: 16
                            },
                            children: 'No subcategories. Use "Add Subcategory" above.'
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 435,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4 grid gap-4",
                            style: {
                                gridTemplateColumns: "repeat(3, 1fr)",
                                maxWidth: 900
                            },
                            children: subcategories.slice().sort((a, b)=>a.sortOrder - b.sortOrder).map((sub, index)=>{
                                const colors = TILE_COLORS[index % TILE_COLORS.length];
                                const isSelected = selectedSubCategoryId === sub.id;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>selectSubcategory(sub.id),
                                    className: "flex min-h-[100px] flex-col items-center justify-center rounded-lg p-4 transition-all",
                                    style: {
                                        background: isSelected ? "#333" : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                        border: `2px solid ${colors.border}`,
                                        transform: isSelected ? "translateY(-2px)" : "translateY(0)"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-center text-sm font-bold uppercase tracking-wide text-white",
                                            style: {
                                                lineHeight: 1.3
                                            },
                                            children: sub.name
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 461,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-2 h-0.5 w-10 rounded",
                                            style: {
                                                background: colors.accent
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 467,
                                            columnNumber: 25
                                        }, this)
                                    ]
                                }, sub.id, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 450,
                                    columnNumber: 23
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 439,
                            columnNumber: 15
                        }, this),
                        inSubcategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide",
                                    style: {
                                        color: "#ddd",
                                        borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].primary
                                    },
                                    children: selectedSubcategory.name
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 480,
                                    columnNumber: 17
                                }, this),
                                filteredItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: "#888",
                                        paddingTop: 24,
                                        textAlign: "center"
                                    },
                                    children: 'No items. Use "Create Item" above.'
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 487,
                                    columnNumber: 19
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid gap-3",
                                    style: {
                                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))"
                                    },
                                    children: filteredItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            draggable: true,
                                            onDragStart: ()=>{
                                                setDraggingItemId(item.id);
                                                setDragOverItemId(item.id);
                                            },
                                            onDragOver: (e)=>{
                                                e.preventDefault();
                                                if (draggingItemId && dragOverItemId !== item.id && selectedSubCategoryId) {
                                                    setDragOverItemId(item.id);
                                                    const ordered = filteredItems;
                                                    const next = reorderById(ordered, draggingItemId, item.id).map((it, index)=>({
                                                            ...it,
                                                            sortOrder: index
                                                        }));
                                                    persistItemOrder(selectedSubCategoryId, next);
                                                }
                                            },
                                            onDragEnd: ()=>{
                                                setDraggingItemId(null);
                                                setDragOverItemId(null);
                                            },
                                            className: `flex flex-col rounded-lg border-2 p-3 ${dragOverItemId === item.id && draggingItemId ? "ring-2 ring-amber-400" : ""}`,
                                            style: {
                                                background: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].bgPanel,
                                                borderColor: item.deletedAt ? "#444" : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["COLORS"].borderLight,
                                                opacity: item.deletedAt ? 0.75 : 1
                                            },
                                            children: [
                                                item.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: item.imageUrl.startsWith("http") ? item.imageUrl : `${API_URL}${item.imageUrl}`,
                                                    alt: "",
                                                    className: "mb-2 h-20 w-full rounded object-cover"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 536,
                                                    columnNumber: 27
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 flex h-20 w-full items-center justify-center rounded text-xs",
                                                    style: {
                                                        background: "#333",
                                                        color: "#666"
                                                    },
                                                    children: "No image"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 546,
                                                    columnNumber: 27
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-semibold text-white text-sm",
                                                    children: item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 553,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-sm font-semibold text-green-400",
                                                    children: formatPesos(item.priceCents)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 554,
                                                    columnNumber: 25
                                                }, this),
                                                item.deletedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mt-1 text-xs text-red-400",
                                                    children: "Deleted"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 558,
                                                    columnNumber: 27
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-2 flex gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: item.deletedAt ? `/items/${item.id}?includeDeleted=1` : `/items/${item.id}`,
                                                            className: "text-xs text-amber-400 hover:underline",
                                                            children: "Edit"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                            lineNumber: 561,
                                                            columnNumber: 27
                                                        }, this),
                                                        item.deletedAt ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>handleRestoreItem(item),
                                                            className: "text-xs text-green-400 hover:underline",
                                                            children: "Restore"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                            lineNumber: 572,
                                                            columnNumber: 29
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>handleDeleteItem(item),
                                                            className: "text-xs text-red-400 hover:underline",
                                                            children: "Delete"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                            lineNumber: 580,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                                    lineNumber: 560,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, item.id, true, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 496,
                                            columnNumber: 23
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 491,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 404,
                columnNumber: 7
            }, this),
            editCategoryId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-sm rounded-lg bg-white p-4 shadow-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "mb-3 font-semibold",
                            children: "Edit Category"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 603,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleEditCategory,
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-gray-600",
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 606,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: editCategoryName,
                                            onChange: (e)=>setEditCategoryName(e.target.value),
                                            className: "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 607,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 605,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-gray-600",
                                            children: "Slug"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 615,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: editCategorySlug,
                                            onChange: (e)=>setEditCategorySlug(e.target.value),
                                            className: "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 616,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 614,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setEditCategoryId(null),
                                            className: "rounded border border-gray-300 px-3 py-1.5 text-sm",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 624,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: saving || !editCategoryName.trim(),
                                            className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50",
                                            children: "Save"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 631,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 623,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 604,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                    lineNumber: 602,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 601,
                columnNumber: 9
            }, this),
            showAddCategoryModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-sm rounded-lg bg-white p-4 shadow-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "mb-3 font-semibold",
                            children: "Add Category"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 647,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleAddCategory,
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-gray-600",
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 650,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: addCategoryName,
                                            onChange: (e)=>setAddCategoryName(e.target.value),
                                            className: "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm",
                                            autoFocus: true
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 651,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 649,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                setShowAddCategoryModal(false);
                                                setAddCategoryName("");
                                            },
                                            className: "rounded border border-gray-300 px-3 py-1.5 text-sm",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 660,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: saving || !addCategoryName.trim(),
                                            className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50",
                                            children: "Add"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 670,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 659,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 648,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                    lineNumber: 646,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 645,
                columnNumber: 9
            }, this),
            showAddSubcategoryModal && currentCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-sm rounded-lg bg-white p-4 shadow-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "mb-3 font-semibold",
                            children: "Add Subcategory"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 686,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleAddSubcategory,
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-gray-600",
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 689,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: addSubName,
                                            onChange: (e)=>setAddSubName(e.target.value),
                                            className: "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm",
                                            autoFocus: true
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 690,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 688,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                setShowAddSubcategoryModal(false);
                                                setAddSubName("");
                                            },
                                            className: "rounded border border-gray-300 px-3 py-1.5 text-sm",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 699,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: saving || !addSubName.trim(),
                                            className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50",
                                            children: "Add"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 709,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 698,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 687,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                    lineNumber: 685,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 684,
                columnNumber: 9
            }, this),
            editSubId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-sm rounded-lg bg-white p-4 shadow-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "mb-3 font-semibold",
                            children: "Edit Subcategory"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 725,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleEditSubcategory,
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-gray-600",
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 728,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: editSubName,
                                            onChange: (e)=>setEditSubName(e.target.value),
                                            className: "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 729,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 727,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setEditSubId(null),
                                            className: "rounded border border-gray-300 px-3 py-1.5 text-sm",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 737,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: saving || !editSubName.trim(),
                                            className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50",
                                            children: "Save"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                            lineNumber: 744,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                                    lineNumber: 736,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                            lineNumber: 726,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                    lineNumber: 724,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
                lineNumber: 723,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/cloud-ui/src/app/menu/page.tsx",
        lineNumber: 313,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=apps_cloud-ui_src_6b54e819._.js.map