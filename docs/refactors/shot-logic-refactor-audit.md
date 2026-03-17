# Shot Logic Refactor – Phase 1 Audit

## 1. Files to touch (exact list)

| File | Change |
|------|--------|
| **New** `apps/web/src/lib/shotHelpers.ts` | Add `resolveIncludedShots`, `resolveChargeableExtraShots` |
| `apps/web/src/lib/buildTransactionPayload.ts` | Optional: add `includedShots` to CartItem for clarity; no logic change |
| `apps/web/src/app/pos/register/pos-register-client.tsx` | Use helpers; replace defaultShots12oz/16oz with included-shots from item |
| `apps/api/src/index.ts` | items/:id: return `includedShotsBySizeAndTemp` from size prices + defaultShots fallback |
| `apps/api/src/routes/posTransactions.ts` | Resolve included shots per line by (itemId, baseType, sizeLabel); use in calculateShotsUpcharge |
| `apps/api/prisma/schema.prisma` | Add `includedShots Int?` to CloudMenuItemSizePrice |
| `apps/api/src/services/syncCatalog.service.ts` | Sync `includedShots` from menuItemSizePrices |
| **Cloud-api** `apps/cloud-api/prisma/schema.prisma` | Add `includedShots Int?` to MenuItemSizePrice |
| **Cloud-api** `apps/cloud-api/src/routes/sync.ts` | Expose `includedShots` in menuItemSizePrices payload |
| **Cloud-api** `apps/cloud-api/src/routes/admin.ts` | Optional: allow setting includedShots on size price (can defer) |

**Not changed:** receipt/sticker print (already use total shots + upcharge from line); buildTransactionPayload only passes through; cart line keeps `defaultShotsForSize` name but set to resolved included shots.

**Cloud-api DB migration:** After adding `includedShots` to `MenuItemSizePrice` in cloud-api schema, run `npx prisma migrate dev` (or your deploy process) so the column exists. Sync and POS work without it (null = use item defaultShots).

---

## 2. Helpers to introduce

### A. `resolveIncludedShots({ item, selectedSizeId, selectedTemp }): number`

- **Input:** item with either:
  - `includedShotsBySizeAndTemp?: Record<string, number>` (key = `${baseType}|${sizeOptionCloudId}`), and/or
  - `defaultShots?: number`, and/or legacy `defaultShots12oz?`, `defaultShots16oz?`.
- **Logic:** If `includedShotsBySizeAndTemp` exists and has key `${selectedTemp}|${selectedSizeId}`, return it. Else if item has `defaultShots` (number), return that. Else fallback: size name contains "12" → defaultShots12oz ?? 0, else defaultShots16oz ?? 0.
- **Return:** Sane fallback 0 when nothing is available.

### B. `resolveChargeableExtraShots({ selectedShots, includedShots }): number`

- **Return:** `Math.max(0, selectedShots - includedShots)`.
- Used for pricing and display of “X charged”.

---

## 3. Current flow (brief)

1. **Product mapping:** Cloud has MenuItem.defaultShots (single). Sync stores in CloudMenuItem.defaultShots. API items/:id maps to `defaultShots12oz` and `defaultShots16oz` both = defaultShots (no temp, size-only via 12/16 name hack).
2. **Item config:** openItemConfig sets initial shots from size name (12 → defaultShots12oz, else defaultShots16oz). toggleOption (size change) updates shots the same way. Temp is ignored for included count.
3. **Add-to-cart:** defaultShotsForSize = 12oz ? defaultShots12oz : defaultShots16oz; shotsUpcharge = max(0, shotsQty - defaultShotsForSize) then bundle pricing.
4. **Cart line:** Stores defaultShotsForSize, shotsQty, shotsUpchargeCents. Display uses defaultShotsForSize for “X free, Y charged”.
5. **Transaction create:** Server gets cloudItem.defaultShots (single) per item; uses it for every line of that item regardless of size/temp. Recalculates shots upcharge.
6. **Print:** Sticker/receipt use total shots and upcharge from line; no separate “included” display.

---

## 4. Bugs this refactor fixes

- **Hot vs iced same free shots:** Today hot and iced use the same included count (size-only). Refactor uses backend per size+temp when available.
- **Server ignores size/temp for shots:** posTransactions uses one defaultShots per item; line’s baseType/sizeLabel are ignored for shots. Refactor resolves included shots by (itemId, baseType, sizeLabel).
- **Fragile size detection:** “12”/“16” in size name is brittle (e.g. 22oz, 1-Liter). Refactor keys by size option id + temp from backend when available.
- **Double default source:** defaultShots12oz/16oz and shotsDefaultSource add complexity; refactor centralizes on one resolved included value.

---

## 5. Migration / backward compatibility

- **Old transactions/cart lines:** May only have defaultShotsForSize (or nothing). Server recalculates upcharge using resolved includedShots; for old lines we resolve by (itemId, baseType, sizeLabel). If no size price row or includedShots, fallback to cloudItem.defaultShots. No crash; deterministic.
- **Legacy items (no cloud):** POS still supports Item.defaultShots12oz/16oz; helper fallback uses them when includedShotsBySizeAndTemp and defaultShots are missing.
- **Cloud without includedShots on size prices:** New column nullable; sync sends null; API builds includedShotsBySizeAndTemp using item.defaultShots for every (baseType, sizeOptionId). Behavior matches current “single default per item” until cloud config is set.
- **Schema:** New column `CloudMenuItemSizePrice.includedShots Int?` and cloud `MenuItemSizePrice.includedShots Int?`; existing rows get null.

---

## 6. Test scenarios (from spec)

1. Hot 12oz 1 shot / iced 12oz 2 shots / iced 12oz 3 shots → no charge / no charge / 1 extra charged: requires backend to send per-size+temp included shots; refactor enables it.
2. Large hot 2, large iced 3; switching temp recomputes included: UI will use helper on size+temp change and show correct “free” count.
3. No backend config for combo: fallback to item defaultShots (or 0); no crash.
4. Cart line total = item detail total: same formula (chargeableExtraShots) used in both.
5. Printed output: unchanged (total shots + upcharge); no misleading extra count.

---

Next: Phase 2 – add helpers and wire POS to use them; Phase 3 – data pipeline (cloud + sync + API); Phase 4 – replace all defaultShots12oz/16oz usages; Phase 5 – cleanup remaining legacy references.
