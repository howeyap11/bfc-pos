(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/cloud-ui/src/components/ItemForm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ItemForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
const API_URL = ("TURBOPACK compile-time value", "http://localhost:4000") || "http://localhost:4000";
const DRINK_MODES = [
    "ICED",
    "HOT",
    "CONCENTRATED"
];
const MODE_LABELS = {
    HOT: "Hot",
    ICED: "Iced",
    CONCENTRATED: "Concentrated"
};
const DEFAULT_DRINK_SIZES_BY_MODE = {
    ICED: {
        enabledOptionIds: [],
        defaultOptionId: null
    },
    HOT: {
        enabledOptionIds: [],
        defaultOptionId: null
    },
    CONCENTRATED: {
        enabledOptionIds: [],
        defaultOptionId: null
    }
};
function parseQty(v) {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? 0 : n;
}
/** Price input: store cents internally when focused, display prop when not. No effect - pure render. */ function PriceCentsInput({ valueCents, onChange, disabled, className }) {
    _s();
    const [local, setLocal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [focused, setFocused] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Pure display: when focused use local, when not focused use valueCents. No effect.
    const displayValue = focused ? local : valueCents != null ? (valueCents / 100).toFixed(2) : "";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        type: "text",
        inputMode: "decimal",
        disabled: disabled,
        value: displayValue,
        onChange: (e)=>setLocal(e.target.value),
        onFocus: ()=>{
            setFocused(true);
            setLocal(valueCents != null ? (valueCents / 100).toFixed(2) : "");
        },
        onBlur: ()=>{
            setFocused(false);
            const parsed = parseFloat(local.replace(/,/g, ""));
            if (!Number.isNaN(parsed) && parsed >= 0) {
                onChange(Math.round(parsed * 100));
            } else if (local.trim() === "") {
                onChange(undefined);
            } else {
                onChange(valueCents);
            }
        },
        className: className
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, this);
}
_s(PriceCentsInput, "tI756We4VLd8oLDqnPK+HNgf64Q=");
_c = PriceCentsInput;
function ItemForm({ mode, itemId, presetCategoryId = "", presetSubCategoryId = "", existingItem = null, onSuccess, onCancel, showDelete = false, onDelete }) {
    _s1();
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [ingredients, setIngredients] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [ingredientCategories, setIngredientCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [menuSizes, setMenuSizes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sizeAvailability, setSizeAvailability] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        ICED: [],
        HOT: [],
        CONCENTRATED: []
    });
    const [drinkSizes, setDrinkSizes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sizesError, setSizesError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [pricePesos, setPricePesos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [isActive, setIsActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [categoryId, setCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [subCategoryId, setSubCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [hasSizes, setHasSizes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [drinkSizesByMode, setDrinkSizesByMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_DRINK_SIZES_BY_MODE);
    const [defaultSizeVariant, setDefaultSizeVariant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sizePricesByMode, setSizePricesByMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [imageFile, setImageFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [imagePreview, setImagePreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [recipeLines, setRecipeLines] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sizeRecipeLines, setSizeRecipeLines] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [newIngredientId, setNewIngredientId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [newQty, setNewQty] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [newByVariant, setNewByVariant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const safeCategories = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ItemForm.useMemo[safeCategories]": ()=>Array.isArray(categories) ? categories : []
    }["ItemForm.useMemo[safeCategories]"], [
        categories
    ]);
    const subCategories = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ItemForm.useMemo[subCategories]": ()=>categoryId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSubCategories"])(safeCategories.find({
                "ItemForm.useMemo[subCategories]": (c)=>c.id === categoryId
            }["ItemForm.useMemo[subCategories]"])?.subCategories) : []
    }["ItemForm.useMemo[subCategories]"], [
        categoryId,
        safeCategories
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ItemForm.useEffect": ()=>{
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getDrinkSizes(),
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getMenuSizes()
            ]).then({
                "ItemForm.useEffect": ([optSizes, menuSizesResult])=>{
                    setDrinkSizes(optSizes);
                    setMenuSizes(menuSizesResult.sizes ?? []);
                    if (menuSizesResult.availability) {
                        setSizeAvailability({
                            ICED: menuSizesResult.availability.ICED ?? [],
                            HOT: menuSizesResult.availability.HOT ?? [],
                            CONCENTRATED: menuSizesResult.availability.CONCENTRATED ?? []
                        });
                    }
                }
            }["ItemForm.useEffect"]).catch({
                "ItemForm.useEffect": ()=>setSizesError("Missing sizes. Run db:seed and configure Menu Settings → Sizes.")
            }["ItemForm.useEffect"]);
        }
    }["ItemForm.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ItemForm.useEffect": ()=>{
            let cancelled = false;
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getCategories(),
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getIngredients(),
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getIngredientCategories(),
                itemId ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getItem(itemId) : Promise.resolve(null),
                itemId ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getRecipe(itemId) : Promise.resolve({
                    lines: [],
                    sizeLines: []
                })
            ]).then({
                "ItemForm.useEffect": ([cats, ings, ingCats, item, recipe])=>{
                    if (cancelled) return;
                    const normalizedCats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeCategoriesResponse"])(cats).categories;
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
                        const next = {
                            ...DEFAULT_DRINK_SIZES_BY_MODE
                        };
                        for (const modeKey of DRINK_MODES){
                            next[modeKey].enabledOptionIds = configs.filter({
                                "ItemForm.useEffect": (c)=>c.mode === modeKey && c.isEnabled
                            }["ItemForm.useEffect"]).map({
                                "ItemForm.useEffect": (c)=>c.optionId
                            }["ItemForm.useEffect"]);
                        }
                        setDrinkSizesByMode(next);
                        if (item.hasSizes) {
                            const defaults = item.drinkModeDefaults ?? [];
                            let loaded = null;
                            for (const d of defaults){
                                const modeKey = d.mode;
                                const optId = d.defaultOptionId ?? d.option?.id;
                                if (optId && next[modeKey].enabledOptionIds.includes(optId)) {
                                    loaded = {
                                        mode: modeKey,
                                        optionId: optId
                                    };
                                    break;
                                }
                            }
                            if (!loaded) {
                                for (const m of DRINK_MODES){
                                    const ids = next[m].enabledOptionIds;
                                    if (ids.length > 0) {
                                        loaded = {
                                            mode: m,
                                            optionId: ids[0]
                                        };
                                        break;
                                    }
                                }
                            }
                            setDefaultSizeVariant(loaded);
                        } else {
                            setDefaultSizeVariant(null);
                        }
                        const sizePrices = item.sizePrices ?? [];
                        if (sizePrices.length > 0) {
                            const byMode = {};
                            for (const modeKey of DRINK_MODES){
                                const entries = sizePrices.filter({
                                    "ItemForm.useEffect.entries": (p)=>p.baseType === modeKey
                                }["ItemForm.useEffect.entries"]);
                                if (entries.length > 0) {
                                    byMode[modeKey] = Object.fromEntries(entries.map({
                                        "ItemForm.useEffect": (p)=>[
                                                p.sizeOptionId,
                                                p.priceCents
                                            ]
                                    }["ItemForm.useEffect"]));
                                }
                            }
                            setSizePricesByMode(byMode);
                        }
                        setRecipeLines((recipe?.lines ?? []).map({
                            "ItemForm.useEffect": (r)=>({
                                    ingredientId: r.ingredientId,
                                    qtyPerItem: parseQty(r.qtyPerItem),
                                    unitCode: r.unitCode
                                })
                        }["ItemForm.useEffect"]));
                        setSizeRecipeLines({
                            "ItemForm.useEffect": ()=>{
                                const raw = (recipe?.sizeLines ?? []).map({
                                    "ItemForm.useEffect.raw": (r)=>({
                                            ingredientId: r.ingredientId,
                                            baseType: r.baseType,
                                            sizeCode: r.sizeCode,
                                            qtyPerItem: parseQty(r.qtyPerItem),
                                            unitCode: r.unitCode
                                        })
                                }["ItemForm.useEffect.raw"]);
                                const seen = new Map();
                                for (const l of raw){
                                    const key = `${l.ingredientId}__${l.baseType}__${l.sizeCode}`;
                                    if (!seen.has(key)) seen.set(key, l);
                                }
                                return Array.from(seen.values());
                            }
                        }["ItemForm.useEffect"]);
                    } else if (presetSubCategoryId || presetCategoryId) {
                        const safeCats = normalizedCats;
                        if (presetSubCategoryId) {
                            for (const cat of safeCats){
                                const subs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeSubCategories"])(cat.subCategories);
                                const sub = subs.find({
                                    "ItemForm.useEffect.sub": (s)=>s.id === presetSubCategoryId
                                }["ItemForm.useEffect.sub"]);
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
                }
            }["ItemForm.useEffect"]).catch({
                "ItemForm.useEffect": (e)=>{
                    if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
                }
            }["ItemForm.useEffect"]).finally({
                "ItemForm.useEffect": ()=>{
                    if (!cancelled) setLoading(false);
                }
            }["ItemForm.useEffect"]);
            return ({
                "ItemForm.useEffect": ()=>{
                    cancelled = true;
                }
            })["ItemForm.useEffect"];
        }
    }["ItemForm.useEffect"], [
        mode,
        itemId,
        presetCategoryId,
        presetSubCategoryId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ItemForm.useEffect": ()=>{
            if (!imageFile) {
                setImagePreview(null);
                return;
            }
            const url = URL.createObjectURL(imageFile);
            setImagePreview(url);
            return ({
                "ItemForm.useEffect": ()=>URL.revokeObjectURL(url)
            })["ItemForm.useEffect"];
        }
    }["ItemForm.useEffect"], [
        imageFile
    ]);
    function setModeEnabled(modeKey, optionId, enabled) {
        setDrinkSizesByMode((prev)=>{
            const next = {
                ...prev
            };
            const enabledIds = enabled ? [
                ...prev[modeKey].enabledOptionIds,
                optionId
            ] : prev[modeKey].enabledOptionIds.filter((id)=>id !== optionId);
            next[modeKey] = {
                ...prev[modeKey],
                enabledOptionIds: enabledIds,
                defaultOptionId: null
            };
            return next;
        });
        if (!enabled && defaultSizeVariant?.mode === modeKey && defaultSizeVariant?.optionId === optionId) {
            setDefaultSizeVariant(null);
        }
    }
    const getModeOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ItemForm.useCallback[getModeOptions]": (modeKey)=>{
            if (!drinkSizes) return [];
            const idsForMode = sizeAvailability[modeKey] ?? [];
            const labelById = new Map(menuSizes.map({
                "ItemForm.useCallback[getModeOptions]": (s)=>[
                        s.id,
                        s.label
                    ]
            }["ItemForm.useCallback[getModeOptions]"]));
            const allowedLabels = new Set(idsForMode.map({
                "ItemForm.useCallback[getModeOptions]": (id)=>labelById.get(id)
            }["ItemForm.useCallback[getModeOptions]"]).filter({
                "ItemForm.useCallback[getModeOptions]": (l)=>!!l
            }["ItemForm.useCallback[getModeOptions]"]));
            if (allowedLabels.size === 0) return drinkSizes.options;
            return drinkSizes.options.filter({
                "ItemForm.useCallback[getModeOptions]": (o)=>allowedLabels.has(o.label)
            }["ItemForm.useCallback[getModeOptions]"]);
        }
    }["ItemForm.useCallback[getModeOptions]"], [
        drinkSizes,
        sizeAvailability,
        menuSizes
    ]);
    function buildDrinkSizesByModeWithDefaults() {
        const result = {
            ...DEFAULT_DRINK_SIZES_BY_MODE
        };
        for (const m of DRINK_MODES){
            const enabled = drinkSizesByMode[m].enabledOptionIds;
            const defaultId = defaultSizeVariant?.mode === m ? defaultSizeVariant.optionId : enabled[0] ?? null;
            result[m] = {
                ...drinkSizesByMode[m],
                defaultOptionId: enabled.includes(defaultId ?? "") ? defaultId : enabled[0] ?? null
            };
        }
        return result;
    }
    function addRecipeLine(unitCode) {
        if (!newIngredientId || newQty === "") return;
        const qty = parseFloat(newQty);
        if (Number.isNaN(qty) || qty < 0) return;
        const ing = ingredients.find((i)=>i.id === newIngredientId);
        const unit = unitCode ?? ing?.unitCode ?? "unit";
        setRecipeLines((prev)=>[
                ...prev,
                {
                    ingredientId: newIngredientId,
                    qtyPerItem: qty,
                    unitCode: unit
                }
            ]);
        setNewIngredientId("");
        setNewQty("");
    }
    function removeRecipeLine(index) {
        const line = recipeLines[index];
        setRecipeLines((prev)=>prev.filter((_, i)=>i !== index));
        if (line) setSizeRecipeLines((prev)=>prev.filter((r)=>r.ingredientId !== line.ingredientId));
    }
    function addSizeRecipeLine(baseType, sizeCode, ingredientId, qtyPerItem, unitCode) {
        if (!ingredientId || Number.isNaN(qtyPerItem) || qtyPerItem < 0) return;
        const unit = unitCode.trim() || "unit";
        setSizeRecipeLines((prev)=>{
            const next = prev.filter((r)=>!(r.ingredientId === ingredientId && r.baseType === baseType && r.sizeCode === sizeCode));
            next.push({
                ingredientId,
                baseType,
                sizeCode,
                qtyPerItem,
                unitCode: unit
            });
            return next;
        });
    }
    function removeSizeRecipeLine(ingredientId, baseType, sizeCode) {
        setSizeRecipeLines((prev)=>prev.filter((r)=>!(r.ingredientId === ingredientId && r.baseType === baseType && r.sizeCode === sizeCode)));
    }
    function copySectionTo(fromMode, fromCode, toMode, toCode) {
        const source = sizeRecipeLines.filter((r)=>r.baseType === fromMode && r.sizeCode === fromCode);
        if (source.length === 0) return;
        setSizeRecipeLines((prev)=>{
            const withoutTarget = prev.filter((r)=>!(r.baseType === toMode && r.sizeCode === toCode));
            const next = [
                ...withoutTarget
            ];
            for (const r of source){
                next.push({
                    ingredientId: r.ingredientId,
                    baseType: toMode,
                    sizeCode: toCode,
                    qtyPerItem: r.qtyPerItem,
                    unitCode: r.unitCode
                });
            }
            return next;
        });
    }
    function setNewForVariant(variantKey, patch) {
        setNewByVariant((prev)=>({
                ...prev,
                [variantKey]: {
                    ...prev[variantKey] ?? {
                        ingredientId: "",
                        qty: ""
                    },
                    ...patch
                }
            }));
    }
    const ingredientById = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ItemForm.useMemo[ingredientById]": ()=>new Map(ingredients.map({
                "ItemForm.useMemo[ingredientById]": (i)=>[
                        i.id,
                        i
                    ]
            }["ItemForm.useMemo[ingredientById]"]))
    }["ItemForm.useMemo[ingredientById]"], [
        ingredients
    ]);
    const ingredientName = (id)=>ingredientById.get(id)?.name ?? id;
    const ingredientUnit = (id)=>ingredientById.get(id)?.unitCode ?? "unit";
    const ingredientImageUrl = (id)=>{
        const ing = ingredientById.get(id);
        if (!ing?.imageUrl) return null;
        return ing.imageUrl.startsWith("http") ? ing.imageUrl : `${API_URL}${ing.imageUrl}`;
    };
    const enabledSizeColumns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ItemForm.useMemo[enabledSizeColumns]": ()=>{
            const cols = [];
            if (drinkSizes && hasSizes) {
                for (const m of DRINK_MODES){
                    const ids = drinkSizesByMode[m].enabledOptionIds;
                    for (const optId of ids){
                        const opt = drinkSizes.options.find({
                            "ItemForm.useMemo[enabledSizeColumns].opt": (o)=>o.id === optId
                        }["ItemForm.useMemo[enabledSizeColumns].opt"]);
                        if (opt) cols.push({
                            mode: m,
                            optionId: optId,
                            label: opt.label
                        });
                    }
                }
            }
            return cols;
        }
    }["ItemForm.useMemo[enabledSizeColumns]"], [
        drinkSizes,
        hasSizes,
        drinkSizesByMode
    ]);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!categoryId || !subCategoryId) {
            setError("Category and subcategory are required.");
            return;
        }
        let priceCents;
        if (hasSizes) {
            const missing = [];
            for (const m of DRINK_MODES){
                for (const optId of drinkSizesByMode[m].enabledOptionIds){
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
            for (const m of DRINK_MODES){
                const map = sizePricesByMode?.[m];
                if (!map) continue;
                for (const v of Object.values(map)){
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
        setSaving(true);
        try {
            if (mode === "create") {
                const item = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].createItem({
                    name,
                    priceCents,
                    isActive,
                    subCategoryId,
                    defaultSizeOptionId: null,
                    hasSizes
                });
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].putItemDrinkSizes(item.id, {
                    drinkSizesByMode: hasSizes ? buildDrinkSizesByModeWithDefaults() : DEFAULT_DRINK_SIZES_BY_MODE,
                    hasSizes,
                    sizePricesByMode: hasSizes ? sizePricesByMode : undefined
                });
                if (imageFile) await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].uploadItemImage(item.id, imageFile);
                onSuccess?.();
            } else if (itemId) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].updateItem(itemId, {
                    name,
                    priceCents,
                    isActive,
                    categoryId,
                    subCategoryId,
                    defaultSizeOptionId: null,
                    hasSizes
                });
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].putItemDrinkSizes(itemId, {
                    drinkSizesByMode: hasSizes ? buildDrinkSizesByModeWithDefaults() : DEFAULT_DRINK_SIZES_BY_MODE,
                    hasSizes,
                    sizePricesByMode: hasSizes ? sizePricesByMode : undefined
                });
                if (imageFile) await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].uploadItemImage(itemId, imageFile);
                onSuccess?.();
            }
        } catch (err) {
            const body = err?.body;
            setError(body?.message ?? (err instanceof Error ? err.message : "Failed to save"));
        } finally{
            setSaving(false);
        }
    }
    async function handleSaveRecipe() {
        if (!itemId) return;
        setError("");
        setSaving(true);
        try {
            const basePayload = hasSizes ? [] : recipeLines.map((r)=>({
                    ingredientId: r.ingredientId,
                    qtyPerItem: r.qtyPerItem,
                    unitCode: r.unitCode
                }));
            const sizePayload = hasSizes && sizeRecipeLines.length > 0 ? sizeRecipeLines.filter((r)=>r.qtyPerItem > 0).map((r)=>({
                    ingredientId: r.ingredientId,
                    baseType: r.baseType,
                    sizeCode: r.sizeCode,
                    qtyPerItem: r.qtyPerItem,
                    unitCode: r.unitCode
                })) : undefined;
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].putRecipe(itemId, basePayload, hasSizes ? sizePayload ?? [] : undefined);
            onSuccess?.();
        } catch (err) {
            setError(err?.body?.message ?? (err instanceof Error ? err.message : "Failed to save recipe"));
        } finally{
            setSaving(false);
        }
    }
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "py-6",
        children: "Loading…"
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
        lineNumber: 622,
        columnNumber: 23
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        onSubmit: handleSubmit,
        className: "mb-8 max-w-3xl space-y-4 rounded border bg-white p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-sm font-medium text-gray-700",
                        children: "Image"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 627,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            imagePreview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: imagePreview,
                                alt: "",
                                className: "h-20 w-20 rounded border object-cover"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 630,
                                columnNumber: 13
                            }, this) : existingItem?.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: existingItem.imageUrl.startsWith("http") ? existingItem.imageUrl : `${API_URL}${existingItem.imageUrl}`,
                                alt: "",
                                className: "h-20 w-20 rounded border object-cover"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 632,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex h-20 w-20 items-center justify-center rounded border border-dashed bg-gray-50 text-xs text-gray-400",
                                children: "No image"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 642,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "file",
                                accept: "image/*",
                                onChange: (e)=>setImageFile(e.target.files?.[0] ?? null),
                                className: "text-sm"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 646,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 628,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 626,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-sm font-medium text-gray-700",
                        children: "Name"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 656,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        value: name,
                        onChange: (e)=>setName(e.target.value),
                        required: true,
                        className: "w-full rounded border border-gray-300 px-3 py-2"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 657,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 655,
                columnNumber: 7
            }, this),
            !hasSizes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-sm font-medium text-gray-700",
                        children: "Base Price (₱)"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 668,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "number",
                        min: 0,
                        step: "0.01",
                        value: pricePesos,
                        onChange: (e)=>setPricePesos(e.target.value),
                        required: !hasSizes,
                        className: "w-full rounded border border-gray-300 px-3 py-2"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 669,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 667,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-sm font-medium text-gray-700",
                        children: "Category"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 682,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: categoryId,
                        onChange: (e)=>{
                            setCategoryId(e.target.value);
                            setSubCategoryId("");
                        },
                        className: "w-full rounded border border-gray-300 px-3 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "—"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 691,
                                columnNumber: 11
                            }, this),
                            safeCategories.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: c.id,
                                    children: c.name
                                }, c.id, false, {
                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                    lineNumber: 693,
                                    columnNumber: 13
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 683,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 681,
                columnNumber: 7
            }, this),
            categoryId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-sm font-medium text-gray-700",
                        children: [
                            "Subcategory ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-red-500",
                                children: "*"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 703,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 702,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: subCategoryId,
                        onChange: (e)=>setSubCategoryId(e.target.value),
                        required: true,
                        className: "w-full rounded border border-gray-300 px-3 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "Select subcategory"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 711,
                                columnNumber: 13
                            }, this),
                            subCategories.map((sc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: sc.id,
                                    children: sc.name
                                }, sc.id, false, {
                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                    lineNumber: 713,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 705,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 701,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded border border-gray-200 bg-gray-50 p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-2 flex items-center gap-2 text-sm font-medium text-gray-700",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: hasSizes,
                                onChange: (e)=>{
                                    const v = e.target.checked;
                                    setHasSizes(v);
                                    if (!v) {
                                        setDrinkSizesByMode(DEFAULT_DRINK_SIZES_BY_MODE);
                                        setDefaultSizeVariant(null);
                                    }
                                },
                                className: "rounded border-gray-300"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 723,
                                columnNumber: 11
                            }, this),
                            "Has Sizes"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 722,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-2 text-xs text-gray-500",
                        children: "Enable sizes and set prices per mode. Sizes come from Menu Settings."
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 738,
                        columnNumber: 9
                    }, this),
                    sizesError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded border border-amber-300 bg-amber-50 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-2 text-sm text-amber-800",
                                children: sizesError
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 743,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/menu-settings/sizes",
                                className: "inline-block rounded bg-amber-600 px-3 py-1.5 text-sm text-white",
                                children: "Go to Menu Settings → Sizes"
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 744,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 742,
                        columnNumber: 11
                    }, this),
                    hasSizes && drinkSizes && drinkSizes.options.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3 space-y-4",
                                children: DRINK_MODES.map((modeKey)=>{
                                    const { enabledOptionIds } = drinkSizesByMode[modeKey];
                                    const modePrices = sizePricesByMode?.[modeKey] ?? {};
                                    const modeOptions = getModeOptions(modeKey);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded border border-gray-200 bg-white p-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                className: "mb-3 text-sm font-semibold text-gray-700",
                                                children: MODE_LABELS[modeKey]
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 761,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2",
                                                children: modeOptions.map((o)=>{
                                                    const enabled = enabledOptionIds.includes(o.id);
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3 text-sm",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "flex shrink-0 items-center gap-1.5",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "checkbox",
                                                                        checked: enabled,
                                                                        onChange: (e)=>setModeEnabled(modeKey, o.id, e.target.checked),
                                                                        className: "rounded border-gray-300"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                        lineNumber: 770,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "w-16",
                                                                        children: o.label
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                        lineNumber: 778,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 769,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-500",
                                                                children: "Price (₱):"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 780,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PriceCentsInput, {
                                                                valueCents: modePrices[o.id],
                                                                onChange: (cents)=>{
                                                                    setSizePricesByMode((prev)=>{
                                                                        const next = {
                                                                            ...prev
                                                                        };
                                                                        const modeMap = {
                                                                            ...next[modeKey] ?? {}
                                                                        };
                                                                        if (cents != null) modeMap[o.id] = cents;
                                                                        else delete modeMap[o.id];
                                                                        next[modeKey] = modeMap;
                                                                        return next;
                                                                    });
                                                                },
                                                                disabled: !enabled,
                                                                className: "w-28 rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 781,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, o.id, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 768,
                                                        columnNumber: 25
                                                    }, this);
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 764,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, modeKey, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 760,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 754,
                                columnNumber: 13
                            }, this),
                            enabledSizeColumns.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-sm font-medium text-gray-700",
                                        children: "Default Size"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 806,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: defaultSizeVariant ? `${defaultSizeVariant.mode}:${defaultSizeVariant.optionId}` : "",
                                        onChange: (e)=>{
                                            const v = e.target.value;
                                            if (!v) {
                                                setDefaultSizeVariant(null);
                                                return;
                                            }
                                            const [mode, optionId] = v.split(":");
                                            if (mode && optionId) setDefaultSizeVariant({
                                                mode: mode,
                                                optionId
                                            });
                                        },
                                        className: "w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "— Select default —"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 827,
                                                columnNumber: 19
                                            }, this),
                                            enabledSizeColumns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: `${col.mode}:${col.optionId}`,
                                                    children: [
                                                        col.label,
                                                        " ",
                                                        MODE_LABELS[col.mode]
                                                    ]
                                                }, `${col.mode}:${col.optionId}`, true, {
                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                    lineNumber: 829,
                                                    columnNumber: 21
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 809,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-xs text-gray-500",
                                        children: "Preselected size when the item is opened (e.g. in POS)."
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 837,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 805,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 721,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        id: "isActive",
                        checked: isActive,
                        onChange: (e)=>setIsActive(e.target.checked),
                        className: "rounded border-gray-300"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 847,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: "isActive",
                        className: "text-sm text-gray-700",
                        children: "Active"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 854,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 846,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-red-600",
                children: error
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 859,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        disabled: saving || !categoryId || !subCategoryId,
                        className: "rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50",
                        children: saving ? "Saving…" : "Save"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 862,
                        columnNumber: 9
                    }, this),
                    onCancel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onCancel,
                        className: "rounded border px-4 py-2",
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 870,
                        columnNumber: 11
                    }, this),
                    showDelete && onDelete && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onDelete,
                        disabled: saving,
                        className: "rounded border border-red-200 px-3 py-1.5 text-red-600 disabled:opacity-50",
                        children: "Delete item"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 875,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 861,
                columnNumber: 7
            }, this),
            mode === "edit" && itemId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "mt-8 rounded border bg-white p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "mb-3 text-lg font-medium",
                        children: "Recipe"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 888,
                        columnNumber: 11
                    }, this),
                    hasSizes && enabledSizeColumns.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-6",
                        children: enabledSizeColumns.map((col)=>{
                            const variantKey = `${col.mode}:${col.label}`;
                            const sectionTitle = `${name || "Item"} ${col.label} ${MODE_LABELS[col.mode]}`;
                            const sectionLines = sizeRecipeLines.filter((r)=>r.baseType === col.mode && r.sizeCode === col.label);
                            const newState = newByVariant[variantKey] ?? {
                                ingredientId: "",
                                qty: ""
                            };
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded border border-gray-200 bg-gray-50 p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700",
                                        children: sectionTitle
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 907,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "mb-4 space-y-2",
                                        children: sectionLines.map((r)=>{
                                            const unit = ingredientUnit(r.ingredientId);
                                            const imgUrl = ingredientImageUrl(r.ingredientId);
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: "flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100",
                                                                children: imgUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                    src: imgUrl,
                                                                    alt: "",
                                                                    className: "h-full w-full object-cover"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                    lineNumber: 922,
                                                                    columnNumber: 33
                                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                    className: "h-5 w-5 text-gray-400",
                                                                    fill: "none",
                                                                    viewBox: "0 0 24 24",
                                                                    stroke: "currentColor",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                        strokeLinecap: "round",
                                                                        strokeLinejoin: "round",
                                                                        strokeWidth: 2,
                                                                        d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                        lineNumber: 925,
                                                                        columnNumber: 35
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                    lineNumber: 924,
                                                                    columnNumber: 33
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 920,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: ingredientName(r.ingredientId)
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 929,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 919,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-500 text-xs",
                                                                children: "Qty:"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 932,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "number",
                                                                min: 0,
                                                                step: "any",
                                                                value: r.qtyPerItem,
                                                                onChange: (e)=>{
                                                                    const v = parseFloat(e.target.value);
                                                                    if (!Number.isNaN(v) && v >= 0) {
                                                                        setSizeRecipeLines((prev)=>prev.map((x)=>x.ingredientId === r.ingredientId && x.baseType === r.baseType && x.sizeCode === r.sizeCode ? {
                                                                                    ...x,
                                                                                    qtyPerItem: v
                                                                                } : x));
                                                                    }
                                                                },
                                                                className: "w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 933,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "w-10 text-gray-500",
                                                                children: unit
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 954,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>removeSizeRecipeLine(r.ingredientId, r.baseType, r.sizeCode),
                                                                className: "rounded p-1 text-red-600 hover:bg-red-50",
                                                                title: "Remove",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    "aria-hidden": true,
                                                                    children: "🗑"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                    lineNumber: 963,
                                                                    columnNumber: 31
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 955,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 931,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, `${r.ingredientId}-${r.baseType}-${r.sizeCode}`, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 915,
                                                columnNumber: 25
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 910,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-end gap-2 border-t border-gray-200 pt-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "mb-1 block text-xs text-gray-500",
                                                        children: "Ingredient"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 972,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        value: newState.ingredientId,
                                                        onChange: (e)=>{
                                                            const ing = ingredients.find((i)=>i.id === e.target.value);
                                                            setNewForVariant(variantKey, {
                                                                ingredientId: e.target.value,
                                                                unitCode: ing?.unitCode ?? newState.unitCode
                                                            });
                                                        },
                                                        className: "rounded border border-gray-300 px-2 py-1.5 text-sm",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "Select"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 984,
                                                                columnNumber: 27
                                                            }, this),
                                                            ingredients.filter((ing)=>!sectionLines.some((l)=>l.ingredientId === ing.id)).map((ing)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: ing.id,
                                                                    children: ing.name
                                                                }, ing.id, false, {
                                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                    lineNumber: 991,
                                                                    columnNumber: 31
                                                                }, this))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 973,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 971,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "mb-1 block text-xs text-gray-500",
                                                        children: "Qty"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 998,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "number",
                                                        min: 0,
                                                        step: "any",
                                                        value: newState.qty,
                                                        onChange: (e)=>setNewForVariant(variantKey, {
                                                                qty: e.target.value
                                                            }),
                                                        placeholder: "0",
                                                        className: "w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 999,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 997,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "mb-1 block text-xs text-gray-500",
                                                        children: "Unit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1010,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "text",
                                                        value: newState.unitCode,
                                                        onChange: (e)=>setNewForVariant(variantKey, {
                                                                unitCode: e.target.value
                                                            }),
                                                        placeholder: "unit",
                                                        className: "w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1011,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1009,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>{
                                                    const qty = parseFloat(newState.qty);
                                                    if (newState.ingredientId && !Number.isNaN(qty) && qty >= 0) {
                                                        addSizeRecipeLine(col.mode, col.label, newState.ingredientId, qty, newState.unitCode.trim() || "unit");
                                                        setNewForVariant(variantKey, {
                                                            ingredientId: "",
                                                            qty: "",
                                                            unitCode: newState.unitCode
                                                        });
                                                    }
                                                },
                                                className: "rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700",
                                                children: "+ Add"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1021,
                                                columnNumber: 23
                                            }, this),
                                            enabledSizeColumns.filter((c)=>c.mode !== col.mode || c.label !== col.label).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-end gap-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "mb-1 block text-xs text-gray-500",
                                                        children: "Copy to"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1046,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "rounded border border-gray-300 px-2 py-1.5 text-sm",
                                                        defaultValue: "",
                                                        onChange: (e)=>{
                                                            const v = e.target.value;
                                                            if (!v) return;
                                                            const [toMode, toCode] = v.split(":");
                                                            if (toMode && toCode) copySectionTo(col.mode, col.label, toMode, toCode);
                                                            e.target.value = "";
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "—"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 1059,
                                                                columnNumber: 29
                                                            }, this),
                                                            enabledSizeColumns.filter((c)=>c.mode !== col.mode || c.label !== col.label).map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: `${c.mode}:${c.label}`,
                                                                    children: [
                                                                        c.label,
                                                                        " ",
                                                                        MODE_LABELS[c.mode]
                                                                    ]
                                                                }, `${c.mode}:${c.label}`, true, {
                                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                    lineNumber: 1063,
                                                                    columnNumber: 33
                                                                }, this))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1047,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1045,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 970,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, variantKey, true, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 903,
                                columnNumber: 19
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 891,
                        columnNumber: 13
                    }, this) : hasSizes && enabledSizeColumns.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800",
                        children: "Enable at least one size above to edit recipe per size variant."
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 1079,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                className: "mb-4 min-w-full divide-y divide-gray-200",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                        className: "bg-gray-50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                    className: "px-4 py-2 text-left text-xs font-medium uppercase text-gray-500",
                                                    children: "Ingredient"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                    lineNumber: 1087,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                    className: "px-4 py-2 text-left text-xs font-medium uppercase text-gray-500",
                                                    children: "Qty"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                    lineNumber: 1090,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                    className: "px-4 py-2 text-left text-xs font-medium uppercase text-gray-500",
                                                    children: "Unit"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                    lineNumber: 1093,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                    className: "px-4 py-2 text-right text-xs font-medium uppercase text-gray-500",
                                                    children: "Actions"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                    lineNumber: 1096,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                            lineNumber: 1086,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1085,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                        className: "divide-y divide-gray-200",
                                        children: recipeLines.map((line, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-4 py-2 text-sm",
                                                        children: [
                                                            ingredientName(line.ingredientId),
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs text-gray-400",
                                                                children: [
                                                                    "(",
                                                                    line.unitCode,
                                                                    ")"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                                lineNumber: 1106,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1104,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-4 py-2 text-sm",
                                                        children: line.qtyPerItem
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1108,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-4 py-2 text-sm",
                                                        children: line.unitCode
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1109,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-4 py-2 text-right",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>removeRecipeLine(idx),
                                                            className: "text-sm text-red-600 hover:underline",
                                                            children: "Remove"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                            lineNumber: 1111,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1110,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, idx, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1103,
                                                columnNumber: 21
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1101,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 1084,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap items-end gap-2 border-t pt-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-gray-500",
                                                children: "Ingredient"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1125,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: newIngredientId,
                                                onChange: (e)=>{
                                                    setNewIngredientId(e.target.value);
                                                    const ing = ingredients.find((i)=>i.id === e.target.value);
                                                    if (ing) setNewUnitCode(ing.unitCode);
                                                },
                                                className: "rounded border border-gray-300 px-2 py-1.5 text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "",
                                                        children: "Select"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                        lineNumber: 1135,
                                                        columnNumber: 21
                                                    }, this),
                                                    ingredients.map((ing)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: ing.id,
                                                            children: ing.name
                                                        }, ing.id, false, {
                                                            fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                            lineNumber: 1137,
                                                            columnNumber: 23
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1126,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1124,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-gray-500",
                                                children: "Qty"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1144,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                min: 0,
                                                step: "any",
                                                value: newQty,
                                                onChange: (e)=>setNewQty(e.target.value),
                                                placeholder: "0",
                                                className: "w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1145,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1143,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-gray-500",
                                                children: "Unit"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1156,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: newUnitCode,
                                                onChange: (e)=>setNewUnitCode(e.target.value),
                                                placeholder: "unit",
                                                className: "w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                                lineNumber: 1157,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1155,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: addRecipeLine,
                                        className: "rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300",
                                        children: "Add"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                        lineNumber: 1165,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                                lineNumber: 1123,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleSaveRecipe,
                        disabled: saving,
                        className: "mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50",
                        children: saving ? "Saving recipe…" : "Save recipe"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                        lineNumber: 1176,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
                lineNumber: 887,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/cloud-ui/src/components/ItemForm.tsx",
        lineNumber: 625,
        columnNumber: 5
    }, this);
}
_s1(ItemForm, "9CnU3QFf6VEKvukLf1VkShliVMI=");
_c1 = ItemForm;
var _c, _c1;
__turbopack_context__.k.register(_c, "PriceCentsInput");
__turbopack_context__.k.register(_c1, "ItemForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/cloud-ui/src/app/items/[id]/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EditItemPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$components$2f$ItemForm$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/cloud-ui/src/components/ItemForm.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const TOAST_KEY = "items_toast";
function EditItemPage() {
    _s();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const id = params.id;
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const [item, setItem] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditItemPage.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getItem(id, includeDeleted).then(setItem).catch({
                "EditItemPage.useEffect": (e)=>setError(e instanceof Error ? e.message : "Failed to load")
            }["EditItemPage.useEffect"]).finally({
                "EditItemPage.useEffect": ()=>setLoading(false)
            }["EditItemPage.useEffect"]);
        }
    }["EditItemPage.useEffect"], [
        id,
        includeDeleted
    ]);
    async function handleDelete() {
        if (!confirm(`Delete item "${item?.name}"?`)) return;
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].deleteItem(id);
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TOAST_KEY, "Item deleted");
            router.replace("/menu");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete");
        }
    }
    async function handleRestore() {
        if (!confirm(`Restore item "${item?.name}"?`)) return;
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].restoreItem(id);
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TOAST_KEY, "Item restored");
            router.replace("/menu");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to restore");
        }
    }
    function handleSuccess() {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getItem(id).then(setItem);
    }
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto max-w-6xl px-4 py-6",
        children: "Loading…"
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
        lineNumber: 55,
        columnNumber: 23
    }, this);
    if (error && !item) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto max-w-6xl px-4 py-6 text-red-600",
        children: error
    }, void 0, false, {
        fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
        lineNumber: 56,
        columnNumber: 30
    }, this);
    if (!item) return null;
    if (item.deletedAt) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto max-w-6xl px-4 py-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/menu?includeDeleted=1",
                        className: "text-gray-500 hover:text-gray-700",
                        children: "← Menu"
                    }, void 0, false, {
                        fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                        lineNumber: 63,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                    lineNumber: 62,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded border border-amber-200 bg-amber-50 p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "mb-2 text-xl font-semibold text-amber-800",
                            children: "Item deleted"
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mb-4 text-amber-700",
                            children: [
                                item.name,
                                " has been deleted. Restore it to make it visible again."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mb-3 text-sm text-red-600",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                            lineNumber: 72,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleRestore,
                                    className: "rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700",
                                    children: "Restore item"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                                    lineNumber: 74,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/menu?includeDeleted=1",
                                    className: "rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50",
                                    children: "Back to Menu"
                                }, void 0, false, {
                                    fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                                    lineNumber: 81,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                    lineNumber: 67,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto max-w-6xl px-4 py-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4 flex items-center justify-between",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "/menu",
                    className: "text-gray-500 hover:text-gray-700",
                    children: "← Menu"
                }, void 0, false, {
                    fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                    lineNumber: 96,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                lineNumber: 95,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "mb-4 text-2xl font-semibold",
                children: "Edit Item"
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$cloud$2d$ui$2f$src$2f$components$2f$ItemForm$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                mode: "edit",
                itemId: id,
                existingItem: item,
                onSuccess: handleSuccess,
                showDelete: true,
                onDelete: handleDelete
            }, void 0, false, {
                fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/cloud-ui/src/app/items/[id]/page.tsx",
        lineNumber: 94,
        columnNumber: 5
    }, this);
}
_s(EditItemPage, "QQT9x4olv9veXf+Lhe0D92HRIVw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c = EditItemPage;
var _c;
__turbopack_context__.k.register(_c, "EditItemPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_cloud-ui_src_5338bedd._.js.map