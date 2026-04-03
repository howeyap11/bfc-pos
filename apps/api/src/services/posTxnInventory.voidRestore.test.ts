/**
 * Run: pnpm exec tsx src/services/posTxnInventory.voidRestore.test.ts
 */
import type { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { restoreInventoryForVoid } from "./posTxnInventory.service";

async function run() {
  const prisma = {} as PrismaClient;
  let received: Map<string, import("decimal.js").default> | null = null;
  const inventory = {
    applyPosCloudVoidRestore: async (p: {
      storeId: string;
      transactionId: string;
      restoreByCloudIngredient: Map<string, import("decimal.js").default>;
    }) => {
      received = p.restoreByCloudIngredient;
    },
  };

  await restoreInventoryForVoid({
    prisma,
    storeId: "store_1",
    transactionId: "tx1",
    lineItems: [
      {
        id: "l1",
        qty: 2,
        consumptionPerUnitByIngredientJson: JSON.stringify({ ing_a: "1.5", ing_b: "0.5" }),
        item: { cloudId: "item1" },
      },
    ],
    refunds: [],
    inventory,
  });
  assert.ok(received);
  const r0 = received as Map<string, import("decimal.js").default>;
  assert.equal(r0.get("ing_a")?.toString(), "3");
  assert.equal(r0.get("ing_b")?.toString(), "1");

  received = null;
  await restoreInventoryForVoid({
    prisma,
    storeId: "store_1",
    transactionId: "tx2",
    lineItems: [
      {
        id: "l1",
        qty: 2,
        consumptionPerUnitByIngredientJson: JSON.stringify({ ing_a: "2" }),
        item: { cloudId: "item1" },
      },
    ],
    refunds: [
      {
        refundItems: [{ transactionLineItemId: "l1", qtyRefunded: 1 }],
      },
    ],
    inventory,
  });
  assert.ok(received);
  const r1 = received as Map<string, import("decimal.js").default>;
  assert.equal(r1.get("ing_a")?.toString(), "2");

  received = null;
  await restoreInventoryForVoid({
    prisma,
    storeId: "store_1",
    transactionId: "tx3",
    lineItems: [
      {
        id: "l1",
        qty: 1,
        consumptionPerUnitByIngredientJson: JSON.stringify({ ing_a: "1" }),
        item: { cloudId: "item1" },
      },
    ],
    refunds: [
      {
        refundItems: [{ transactionLineItemId: "l1", qtyRefunded: 1 }],
      },
    ],
    inventory,
  });
  assert.ok(received);
  assert.equal((received as Map<string, import("decimal.js").default>).size, 0);

  console.log("posTxnInventory.restoreInventoryForVoid: ok");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
