// apps/api/prisma/seed.ts
// Minimal bootstrap for launch: ensures Store (and optional StoreConfig) exist.
// Menu, staff, etc. come from backend/cloud sync. Tables, zones, SOP are not seeded.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_ID = "store_1";

async function ensureStore() {
  await prisma.store.upsert({
    where: { id: STORE_ID },
    update: {
      code: "BFC-LOCAL",
      name: "But First, Coffee (Local)",
    },
    create: {
      id: STORE_ID,
      code: "BFC-LOCAL",
      name: "But First, Coffee (Local)",
    },
  });
  console.log("✅ Store ready");
}

async function ensureStoreConfig() {
  await prisma.storeConfig.upsert({
    where: { storeId: STORE_ID },
    update: {},
    create: {
      storeId: STORE_ID,
      enabledPaymentMethods: JSON.stringify(["CASH", "CARD", "GCASH", "FOODPANDA"]),
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
    },
  });
  console.log("✅ Store config ready");
}

async function main() {
  await ensureStore();
  await ensureStoreConfig();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
