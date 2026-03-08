# POS Register UI Spec

## Layout
- Left: menu browsing and item selection (Browse Mode) OR item customization (Customize Mode)
- Right: cart panel (persistent) + embedded staff selector + payment area

The cart panel remains visible while the left side changes between Browse and Customize.

---

## Register Views

### Browse Mode
- Default view
- Cashier browses categories → subcategories → item cards
- Clicking an item card opens Customize Mode for that item

### Customize Mode (Item Customization Panel)
When an item is clicked:
- Left ~80% becomes the Item Customization Panel
- Right cart panel (~20%) remains visible and unchanged

Top bar:
- Back button: returns to Browse Mode (preserves category/subcategory selection)
- Item name: prominent
- Base price: prominent

---

## Customization Defaults (On Open)

When opening Customize Mode, the system pre-selects:

- **Temperature:** ICED (if a Temperature group exists; otherwise use DB defaults)
- **Size:** 16oz (if a Size group exists; otherwise use DB defaults)
- **Fulfillment:** FOR_HERE (required field)
- **Milk:** item.defaultMilk (fallback FULL_CREAM)
- **Other option groups:** DB defaults (`option.isDefault = true`)
- **Espresso shots:** item.defaultEspressoShots (fallback 0)
- **Note:** empty
- **Qty:** 1

These defaults exist to reduce cashier clicks and match most common orders. :contentReference[oaicite:4]{index=4}

---

## Customization Sections (Order)

1) Major Options (if present)
- Temperature (ICED/HOT)
- Size (e.g., 12oz/16oz/22oz)
- Required indicator (*) if applicable

2) Add-ons / Modifiers
- Sauces, syrups, foams (multi-select)
- Other option groups (per item)

3) Espresso Shots
- Stepper 0..N
- Shows live pricing next to stepper
- If item is espresso-series:
  - show helper text: “First 2 FREE • +₱40 per 2 shots after”
  - FREE badge when shots ≤ 2
- If non-espresso:
  - charge ₱40 per shot

Pricing rules are behavior; this section describes UI expectations only. :contentReference[oaicite:5]{index=5}

4) Milk (single-select)
- Shows item’s default milk as the baseline
- Selecting non-default milk shows +₱10 delta
- Default selection = item.defaultMilk

5) Special Instructions
- Textarea placeholder: `e.g. No Sugar, Extra Hot, Light Ice`
- Stored as `note` on the cart line

6) Fulfillment selector (required per item)
- Options: FOR_HERE / TAKE_OUT / FOODPANDA
- Default: FOR_HERE
- FOODPANDA button displays surcharge: `(+₱xx.xx)` based on item.foodpandaSurchargeCents

7) Quantity control
- min 1
- +/- stepper

8) Live price breakdown
Must reflect:
- Base price
- Selected options total
- Espresso shots upcharge (or FREE)
- Milk delta (if any)
- Foodpanda surcharge (if any)
- Unit price
- Quantity multiplier
- Line total (bold)

---

## Bottom Action Bar
- Add to Cart:
  - persists selected options
  - persists milkChoice
  - persists shotsQty (and pricing snapshot if implemented)
  - persists fulfillment + surcharge
  - persists note
  - returns to Browse Mode
- Cancel:
  - discards configuration
  - returns to Browse Mode

---

## Embedded Staff Selector (Cart Header)
- Shows “Select Staff” when none active
- Shows active staff name + role when active
- Opens staff modal for login/switch/logout

Payment actions must be blocked when no staff is active.

---

## Payment Buttons
- Rendered based on StoreConfig enabled methods
- Split button visible only when split is enabled
- Payment button click is the primary checkout trigger

---

## Split Modal
- Opening split modal does not create a transaction
- Transaction is created only when user clicks Charge (if needed)
- Must enforce Remaining == 0 before Charge

---

## Cart Line Display Requirements
Cart line should surface key modifiers clearly:
- Selected major options (temperature/size)
- Espresso shots (if > 0; show FREE context if applicable)
- Milk choice (if applicable)
- Fulfillment badge (FOR_HERE / TAKE_OUT / FOODPANDA)
- Note (if provided)

---

## Error Handling UX (Critical Paths)

### openItemConfig stability
If an item click fails (network failure, invalid item, null response), UI must:
- show an error message (banner/toast)
- avoid blank screens
- remain usable (return to Browse)

Customize Mode fallback:
If `registerView === "CUSTOMIZE"` but `configuringItem` is null, show a fallback view:
- “No item selected”
- “Back to Browse” button

This prevents crashes caused by inconsistent state. :contentReference[oaicite:6]{index=6}