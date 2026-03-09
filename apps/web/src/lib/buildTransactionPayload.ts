/**
 * Single source of truth for building transaction create payloads.
 * All payment flows MUST use this to prevent money-accuracy bugs.
 */

type MilkType = "FULL_CREAM" | "OAT" | "ALMOND" | "SOY";

export type CartItem = {
  tempId: string;
  itemId: string;
  itemName: string;
  basePrice: number;
  qty: number;
  baseType?: "HOT" | "ICED" | "CONCENTRATED";
  sizeLabel?: string;
  selectedOptions: Array<{
    id: string;
    name: string;
    groupName: string;
    priceDelta: number;
  }>;
  milkChoice?: MilkType;
  defaultMilk?: MilkType;
  shotsQty?: number;
  defaultShotsForSize?: number;
  shotsUpchargeCents?: number;
  /** @deprecated Use transactionTypeCode + surchargeCents. Kept for backward compat. */
  fulfillment?: "FOR_HERE" | "TAKE_OUT" | "FOODPANDA";
  transactionTypeCode?: string;
  transactionTypeLabel?: string;
  optionTotalCents: number;
  surchargeCents: number;
  discountPct: number;
  discountAmount: number;
  discountTag?: "SNR" | "PWD" | null;
  note?: string;
};

export type TxLineInput = {
  itemId: string;
  qty: number;
  optionIds: string[];
  note?: string;
  shotsQty?: number;
  milkChoice?: MilkType;
  baseType?: "HOT" | "ICED" | "CONCENTRATED";
  sizeLabel?: string;
  surchargeCents?: number;
  discountPct?: number;
  discountAmount?: number;
  discountTag?: "SNR" | "PWD" | null;
};

/**
 * Maps cart items to transaction line inputs.
 * CRITICAL: This is the ONLY place where cart -> API mapping happens.
 * All payment flows must call this function.
 */
export function buildTxLineInputs(cart: CartItem[]): TxLineInput[] {
  return cart.map((item) => {
    const output: TxLineInput = {
      itemId: item.itemId,
      qty: Math.max(1, Math.trunc(item.qty || 1)),
      optionIds: item.selectedOptions.map((o) => o.id),
      note: item.note?.trim() || undefined,
      shotsQty: item.shotsQty ?? 0,
      milkChoice: item.milkChoice,
      baseType: item.baseType,
      sizeLabel: item.sizeLabel,
      surchargeCents: item.surchargeCents ?? 0,
      discountPct: item.discountPct ?? 0,
      discountAmount: item.discountAmount ?? 0,
      discountTag: item.discountTag ?? null,
    };

    // DEV-only runtime guard: catch regressions where modifiers are dropped
    if (process.env.NODE_ENV !== "production") {
      if ((item.shotsQty ?? 0) > 0 && (output.shotsQty ?? 0) === 0) {
        console.error("[buildTxLineInputs] CRITICAL: shotsQty dropped!", { item, output });
        throw new Error("Builder dropped shotsQty - this is a money bug!");
      }
      if (item.milkChoice && !output.milkChoice) {
        console.error("[buildTxLineInputs] CRITICAL: milkChoice dropped!", { item, output });
        throw new Error("Builder dropped milkChoice - this is a money bug!");
      }
      if ((item.surchargeCents ?? 0) > 0 && (output.surchargeCents ?? 0) === 0) {
        console.error("[buildTxLineInputs] CRITICAL: surchargeCents dropped!", { item, output });
        throw new Error("Builder dropped surchargeCents - this is a money bug!");
      }
    }

    return output;
  });
}

/**
 * Builds the complete transaction create request body.
 */
export function buildCreateTransactionBody(args: {
  cart: CartItem[];
  discountCents?: number;
  serviceType?: "DINE_IN" | "TO_GO" | "FOODPANDA" | "DELIVERY";
  orderId?: string;
  tablePublicKey?: string;
}) {
  return {
    items: buildTxLineInputs(args.cart),
    discountCents: args.discountCents ?? 0,
    ...(args.serviceType && { serviceType: args.serviceType }),
    ...(args.orderId && { orderId: args.orderId }),
    ...(args.tablePublicKey && { tablePublicKey: args.tablePublicKey }),
  };
}
