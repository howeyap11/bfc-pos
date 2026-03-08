// apps/api/prisma/seed.ts
import { PrismaClient, PrepArea, OptionGroupType } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

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
}

async function upsertGroup(
  name: string,
  data: {
    type: OptionGroupType;
    minSelect: number;
    maxSelect: number;
    isRequired: boolean;
    sort: number;
  }
) {
  // OptionGroup.name is still globally unique in the merged schema I gave,
  // but we also set storeId on create/update for future safety.
  return prisma.optionGroup.upsert({
    where: { name },
    update: { ...data, storeId: STORE_ID },
    create: { name, ...data, storeId: STORE_ID },
  });
}

async function upsertOption(
  groupId: string,
  name: string,
  priceDelta: number,
  isDefault = false,
  sort = 0
) {
  const existing = await prisma.option.findFirst({ where: { groupId, name, storeId: STORE_ID } });
  if (existing) {
    return prisma.option.update({
      where: { id: existing.id },
      data: { priceDelta, isDefault, sort },
    });
  }
  return prisma.option.create({
    data: { storeId: STORE_ID, groupId, name, priceDelta, isDefault, sort },
  });
}

async function linkItemGroup(itemId: string, groupId: string) {
  await prisma.itemOptionGroup.upsert({
    where: { itemId_groupId: { itemId, groupId } },
    update: {},
    create: { itemId, groupId },
  });
}

async function upsertItemImage(itemId: string, url: string, isPrimary = false, sort = 0) {
  const existing = await prisma.itemImage.findFirst({ where: { itemId, url } });
  if (existing) {
    return prisma.itemImage.update({
      where: { id: existing.id },
      data: { isPrimary, sort },
    });
  }
  return prisma.itemImage.create({
    data: { itemId, url, isPrimary, sort },
  });
}

async function upsertMenuBanner(
  keyTitle: string,
  data: {
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    isActive?: boolean;
    sort?: number;
  }
) {
  const existing = await prisma.menuBanner.findFirst({
    where: { storeId: STORE_ID, title: keyTitle },
  });

  if (existing) {
    return prisma.menuBanner.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        imageUrl: data.imageUrl ?? null,
        linkUrl: data.linkUrl ?? null,
        isActive: data.isActive ?? true,
        sort: data.sort ?? 0,
      },
    });
  }

  return prisma.menuBanner.create({
    data: {
      storeId: STORE_ID,
      title: data.title,
      subtitle: data.subtitle ?? null,
      imageUrl: data.imageUrl ?? null,
      linkUrl: data.linkUrl ?? null,
      isActive: data.isActive ?? true,
      sort: data.sort ?? 0,
    },
  });
}

function php(n: number) {
  return Math.round(n * 100);
}

async function seedStoreConfig() {
  console.log("Seeding store config...");
  
  await prisma.storeConfig.upsert({
    where: { storeId: STORE_ID },
    update: {
      enabledPaymentMethods: JSON.stringify(["CASH", "CARD", "GCASH", "FOODPANDA"]),
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
    },
    create: {
      storeId: STORE_ID,
      enabledPaymentMethods: JSON.stringify(["CASH", "CARD", "GCASH", "FOODPANDA"]),
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
    },
  });
  
  console.log("✅ Store config seeded");
}

async function seedStaff() {
  console.log("Seeding staff...");
  
  // Sample staff members with stable auth keys
  const staffMembers = [
    { 
      name: "Andrea", 
      passcode: "1000", 
      role: "ADMIN",
      key: "staff_9ev8p6ej388lku308p3vc" // Stable key for dev
    },
    { 
      name: "John", 
      passcode: "1001", 
      role: "CASHIER",
      key: "staff_idglcga7ccsb73maez1km" // Stable key for dev
    },
    { 
      name: "Maria", 
      passcode: "1002", 
      role: "CASHIER",
      key: "staff_fqv6bxdtcmjuqu3kfgncm" // Stable key for dev
    },
  ];
  
  for (const staff of staffMembers) {
    await prisma.staff.upsert({
      where: { storeId_name: { storeId: STORE_ID, name: staff.name } },
      update: { 
        passcode: staff.passcode, 
        role: staff.role, 
        key: staff.key, // Update key on upsert
        isActive: true 
      },
      create: { storeId: STORE_ID, ...staff },
    });
  }
  
  console.log("✅ Staff seeded with auth keys");
}

async function seedTables() {
  console.log("Seeding zones and tables...");
  
  const zones = [
    { code: "FR", name: "Function Room" },
    { code: "MR", name: "Main Room" },
    { code: "AF", name: "Alfresco" },
  ];

  for (const z of zones) {
    await prisma.zone.upsert({
      where: { storeId_code: { storeId: STORE_ID, code: z.code } },
      update: { name: z.name },
      create: { ...z, storeId: STORE_ID },
    });
  }

  const fr = await prisma.zone.findFirstOrThrow({ where: { storeId: STORE_ID, code: "FR" } });
  const mr = await prisma.zone.findFirstOrThrow({ where: { storeId: STORE_ID, code: "MR" } });
  const af = await prisma.zone.findFirstOrThrow({ where: { storeId: STORE_ID, code: "AF" } });

  const tables: Array<{
    zoneId: string;
    label: string;
    publicKey: string;
    isActive?: boolean;
    isFunctionRoom?: boolean;
  }> = [
      ...[1, 2, 3, 4].map((n) => ({
        zoneId: fr.id,
        label: `FR${n}`,
        publicKey: `FR-${String(n).padStart(2, "0")}`,
        isActive: true,
        isFunctionRoom: true,
      })),
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({
        zoneId: mr.id,
        label: `M${n}`,
        publicKey: `MR-M${String(n).padStart(2, "0")}`,
        isActive: true,
        isFunctionRoom: false,
      })),
      ...[1, 2, 3, 4, 5].map((n) => ({
        zoneId: af.id,
        label: `AF${n}`,
        publicKey: `AF-AF${String(n).padStart(2, "0")}`,
        isActive: true,
        isFunctionRoom: false,
      })),
    ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { publicKey: t.publicKey },
      update: {
        storeId: STORE_ID,
        zoneId: t.zoneId,
        label: t.label,
        isActive: t.isActive ?? true,
        isFunctionRoom: t.isFunctionRoom ?? false,
      },
      create: {
        storeId: STORE_ID,
        zoneId: t.zoneId,
        label: t.label,
        publicKey: t.publicKey,
        isActive: t.isActive ?? true,
        isFunctionRoom: t.isFunctionRoom ?? false,
      },
    });
  }
  
  console.log("✅ Zones and tables seeded");
}

async function seedCategories() {
  console.log("Seeding categories...");
  
  const categories = [
    { name: "coffee", prepArea: PrepArea.BAR, sort: 10 },
    { name: "non-coffee", prepArea: PrepArea.BAR, sort: 20 },
    { name: "pastry", prepArea: PrepArea.BAR, sort: 30 },
    { name: "hidden menu", prepArea: PrepArea.BAR, sort: 40 },
    { name: "pasta", prepArea: PrepArea.KITCHEN, sort: 10 },
    { name: "waffles", prepArea: PrepArea.KITCHEN, sort: 20 },
    { name: "main dishes", prepArea: PrepArea.KITCHEN, sort: 30 },
    { name: "snacks", prepArea: PrepArea.KITCHEN, sort: 40 },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { prepArea: c.prepArea, sort: c.sort, storeId: STORE_ID },
      create: { ...c, storeId: STORE_ID },
    });
  }
  
  console.log("✅ Categories seeded");
}

async function seedItems() {
  console.log("Seeding option groups, options, and items...");
  
  const baseGroups = [
    { name: "Temperature", type: OptionGroupType.SINGLE, minSelect: 1, maxSelect: 1, isRequired: true, sort: 1 },
    { name: "Size", type: OptionGroupType.SINGLE, minSelect: 1, maxSelect: 1, isRequired: true, sort: 2 },
    { name: "Sugar Level", type: OptionGroupType.SINGLE, minSelect: 1, maxSelect: 1, isRequired: true, sort: 3 },
    { name: "Milk", type: OptionGroupType.SINGLE, minSelect: 1, maxSelect: 1, isRequired: true, sort: 4 },
  ];

  for (const g of baseGroups) {
    await prisma.optionGroup.upsert({
      where: { name: g.name },
      update: { ...g, storeId: STORE_ID },
      create: { ...g, storeId: STORE_ID },
    });
  }

  const gTemp = await prisma.optionGroup.findUniqueOrThrow({ where: { name: "Temperature" } });
  const gSize = await prisma.optionGroup.findUniqueOrThrow({ where: { name: "Size" } });
  const gSugar = await prisma.optionGroup.findUniqueOrThrow({ where: { name: "Sugar Level" } });
  const gMilk = await prisma.optionGroup.findUniqueOrThrow({ where: { name: "Milk" } });

  const gAddEspresso = await upsertGroup("Add-ons – Espresso Series", {
    type: OptionGroupType.MULTI, minSelect: 0, maxSelect: 10, isRequired: false, sort: 50,
  });
  const gAddMilky = await upsertGroup("Add-ons – Milky Series", {
    type: OptionGroupType.MULTI, minSelect: 0, maxSelect: 10, isRequired: false, sort: 51,
  });
  const gAddMatcha = await upsertGroup("Add-ons – Matcha", {
    type: OptionGroupType.MULTI, minSelect: 0, maxSelect: 10, isRequired: false, sort: 52,
  });
  const gAddWaffles = await upsertGroup("Add-ons – Waffles", {
    type: OptionGroupType.MULTI, minSelect: 0, maxSelect: 10, isRequired: false, sort: 60,
  });
  const gAddDessert = await upsertGroup("Add-ons – Dessert", {
    type: OptionGroupType.MULTI, minSelect: 0, maxSelect: 10, isRequired: false, sort: 61,
  });

  await upsertOption(gTemp.id, "Hot", 0, true, 1);
  await upsertOption(gTemp.id, "Iced", 0, false, 2);

  await upsertOption(gSize.id, "12oz", 0, true, 1);
  await upsertOption(gSize.id, "16oz", 0, false, 2);
  await upsertOption(gSize.id, "Jar", 0, false, 3);
  await upsertOption(gSize.id, "1-Liter", 0, false, 4);
  await upsertOption(gSize.id, "1-Liter Concentrated", 0, false, 5);

  await upsertOption(gSugar.id, "0%", 0, false, 1);
  await upsertOption(gSugar.id, "25%", 0, false, 2);
  await upsertOption(gSugar.id, "50%", 0, false, 3);
  await upsertOption(gSugar.id, "75%", 0, false, 4);
  await upsertOption(gSugar.id, "Standard", 0, true, 5);
  await upsertOption(gSugar.id, "Extra Sweet", 0, false, 6);

  await upsertOption(gMilk.id, "Full-cream milk", 0, true, 1);
  await upsertOption(gMilk.id, "Oat milk", php(30), false, 2);
  await upsertOption(gMilk.id, "Soy milk", php(20), false, 3);
  await upsertOption(gMilk.id, "Non-fat milk", 0, false, 4);

  await upsertOption(gAddEspresso.id, "Extra shot", php(20), false, 1);
  await upsertOption(gAddEspresso.id, "Sea salt foam", php(25), false, 2);
  await upsertOption(gAddEspresso.id, "Vanilla syrup", php(15), false, 3);
  await upsertOption(gAddEspresso.id, "Caramel syrup", php(15), false, 4);

  await upsertOption(gAddMilky.id, "Sea salt foam", php(25), false, 1);
  await upsertOption(gAddMilky.id, "Whipped cream", php(20), false, 2);
  await upsertOption(gAddMilky.id, "Vanilla ice cream", php(35), false, 3);

  await upsertOption(gAddMatcha.id, "Sea salt foam", php(25), false, 1);
  await upsertOption(gAddMatcha.id, "Extra matcha", php(25), false, 2);
  await upsertOption(gAddMatcha.id, "Whipped cream", php(20), false, 3);

  await upsertOption(gAddWaffles.id, "Vanilla ice cream", php(35), false, 1);
  await upsertOption(gAddWaffles.id, "Banana pudding", php(35), false, 2);
  await upsertOption(gAddWaffles.id, "Whipped cream", php(20), false, 3);
  await upsertOption(gAddWaffles.id, "Extra drizzle", php(15), false, 4);

  await upsertOption(gAddDessert.id, "Vanilla ice cream", php(35), false, 1);
  await upsertOption(gAddDessert.id, "Banana pudding", php(35), false, 2);

  const coffeeCat = await prisma.category.findUniqueOrThrow({ where: { name: "coffee" } });
  const nonCoffeeCat = await prisma.category.findUniqueOrThrow({ where: { name: "non-coffee" } });
  const wafflesCat = await prisma.category.findUniqueOrThrow({ where: { name: "waffles" } });

  // Espresso drinks: 12oz=1 shot, 16oz=2 shots
  const americano = await prisma.item.upsert({
    where: { categoryId_name: { categoryId: coffeeCat.id, name: "Americano" } },
    update: { 
      basePrice: php(95), 
      series: "Espresso Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: true,
      isEspressoDrink: true,
      shotsPricingMode: "ESPRESSO_FREE2_PAIR40",
      defaultShots12oz: 1,
      defaultShots16oz: 2,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 2, // legacy
      isActive: true, 
      isHidden: false, 
      sort: 10, 
      storeId: STORE_ID 
    },
    create: { 
      storeId: STORE_ID, 
      categoryId: coffeeCat.id, 
      name: "Americano", 
      series: "Espresso Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: true,
      isEspressoDrink: true,
      shotsPricingMode: "ESPRESSO_FREE2_PAIR40",
      defaultShots12oz: 1,
      defaultShots16oz: 2,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 2, // legacy
      basePrice: php(95), 
      sort: 10 
    },
  });

  const latte = await prisma.item.upsert({
    where: { categoryId_name: { categoryId: coffeeCat.id, name: "Cafe Latte" } },
    update: { 
      basePrice: php(120), 
      series: "Espresso Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: true,
      isEspressoDrink: true,
      shotsPricingMode: "ESPRESSO_FREE2_PAIR40",
      defaultShots12oz: 1,
      defaultShots16oz: 2,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 2, // legacy
      isActive: true, 
      isHidden: false, 
      sort: 20, 
      storeId: STORE_ID 
    },
    create: { 
      storeId: STORE_ID, 
      categoryId: coffeeCat.id, 
      name: "Cafe Latte", 
      series: "Espresso Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: true,
      isEspressoDrink: true,
      shotsPricingMode: "ESPRESSO_FREE2_PAIR40",
      defaultShots12oz: 1,
      defaultShots16oz: 2,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 2, // legacy
      basePrice: php(120), 
      sort: 20 
    },
  });

  // Matcha Espresso: default 1 shot (both sizes)
  const matchaLatte = await prisma.item.upsert({
    where: { categoryId_name: { categoryId: nonCoffeeCat.id, name: "Matcha Latte" } },
    update: { 
      basePrice: php(140), 
      series: "Matcha Series", 
      defaultMilk: "OAT", 
      supportsShots: true,
      isEspressoDrink: false,
      shotsPricingMode: "PAIR40_NO_FREE",
      defaultShots12oz: 1,
      defaultShots16oz: 1,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 1, // legacy
      isActive: true, 
      isHidden: false, 
      sort: 10, 
      storeId: STORE_ID 
    },
    create: { 
      storeId: STORE_ID, 
      categoryId: nonCoffeeCat.id, 
      name: "Matcha Latte", 
      series: "Matcha Series", 
      defaultMilk: "OAT", 
      supportsShots: true,
      isEspressoDrink: false,
      shotsPricingMode: "PAIR40_NO_FREE",
      defaultShots12oz: 1,
      defaultShots16oz: 1,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 1, // legacy
      basePrice: php(140), 
      sort: 10 
    },
  });

  // Non-espresso drink: no shots support
  const classicWaffle = await prisma.item.upsert({
    where: { categoryId_name: { categoryId: wafflesCat.id, name: "Classic Waffle" } },
    update: { 
      basePrice: php(125), 
      series: "Waffle Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: false,
      isEspressoDrink: false,
      shotsPricingMode: null,
      defaultShots12oz: 0,
      defaultShots16oz: 0,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 0, // legacy
      isActive: true, 
      isHidden: false, 
      sort: 10, 
      storeId: STORE_ID 
    },
    create: { 
      storeId: STORE_ID, 
      categoryId: wafflesCat.id, 
      name: "Classic Waffle", 
      series: "Waffle Series", 
      defaultMilk: "FULL_CREAM", 
      supportsShots: false,
      isEspressoDrink: false,
      defaultShots12oz: 0,
      defaultShots16oz: 0,
      shotsDefaultSource: "MANUAL",
      defaultEspressoShots: 0, // legacy
      basePrice: php(125), 
      sort: 10 
    },
  });

  for (const drink of [americano, latte, matchaLatte]) {
    await linkItemGroup(drink.id, gTemp.id);
    await linkItemGroup(drink.id, gSize.id);
    await linkItemGroup(drink.id, gSugar.id);
  }
  await linkItemGroup(latte.id, gMilk.id);
  await linkItemGroup(matchaLatte.id, gMilk.id);

  await linkItemGroup(americano.id, gAddEspresso.id);
  await linkItemGroup(latte.id, gAddMilky.id);
  await linkItemGroup(matchaLatte.id, gAddMatcha.id);
  await linkItemGroup(classicWaffle.id, gAddWaffles.id);

  await upsertItemImage(americano.id, "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd", true, 1);
  await upsertItemImage(latte.id, "https://images.unsplash.com/photo-1485808191679-5f86510681a2", true, 1);
  await upsertItemImage(matchaLatte.id, "https://images.unsplash.com/photo-1521305916504-4a1121188589", true, 1);
  await upsertItemImage(classicWaffle.id, "https://images.unsplash.com/photo-1562376552-0d160a2f238d", true, 1);

  await upsertMenuBanner("Seasonal Picks", {
    title: "Seasonal Picks",
    subtitle: "Limited-time favorites available this month",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772",
    linkUrl: "/menu?seasonal=1",
    isActive: true,
    sort: 1,
  });

  await upsertMenuBanner("New Additions", {
    title: "New Additions",
    subtitle: "Fresh drops—try them first!",
    imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814",
    linkUrl: "/menu?new=1",
    isActive: true,
    sort: 2,
  });
  
  console.log("✅ Items, option groups, and menu banners seeded");
}

async function seedSopTemplates() {
  console.log("Seeding SOP templates...");
  
  const openingTemplate = await prisma.sopTemplate.upsert({
    where: { id: "sop_opening" },
    update: { name: "Opening Checklist", isActive: true, sort: 1, storeId: STORE_ID },
    create: { id: "sop_opening", storeId: STORE_ID, name: "Opening Checklist", isActive: true, sort: 1 },
  });

  const closingTemplate = await prisma.sopTemplate.upsert({
    where: { id: "sop_closing" },
    update: { name: "Closing Checklist", isActive: true, sort: 2, storeId: STORE_ID },
    create: { id: "sop_closing", storeId: STORE_ID, name: "Closing Checklist", isActive: true, sort: 2 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_opening_1" },
    update: { title: "Turn on lights and equipment", requiresPhoto: false, sort: 1 },
    create: { id: "task_opening_1", templateId: openingTemplate.id, title: "Turn on lights and equipment", requiresPhoto: false, sort: 1 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_opening_2" },
    update: { title: "Check espresso machine temperature", requiresPhoto: false, sort: 2 },
    create: { id: "task_opening_2", templateId: openingTemplate.id, title: "Check espresso machine temperature", requiresPhoto: false, sort: 2 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_opening_3" },
    update: { title: "Stock refrigerator (photo required)", requiresPhoto: true, sort: 3 },
    create: { id: "task_opening_3", templateId: openingTemplate.id, title: "Stock refrigerator (photo required)", requiresPhoto: true, sort: 3 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_opening_4" },
    update: { title: "Clean and sanitize work surfaces", requiresPhoto: false, sort: 4 },
    create: { id: "task_opening_4", templateId: openingTemplate.id, title: "Clean and sanitize work surfaces", requiresPhoto: false, sort: 4 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_closing_1" },
    update: { title: "Clean espresso machine", requiresPhoto: false, sort: 1 },
    create: { id: "task_closing_1", templateId: closingTemplate.id, title: "Clean espresso machine", requiresPhoto: false, sort: 1 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_closing_2" },
    update: { title: "Empty trash and replace bags", requiresPhoto: false, sort: 2 },
    create: { id: "task_closing_2", templateId: closingTemplate.id, title: "Empty trash and replace bags", requiresPhoto: false, sort: 2 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_closing_3" },
    update: { title: "Mop floors (photo required)", requiresPhoto: true, sort: 3 },
    create: { id: "task_closing_3", templateId: closingTemplate.id, title: "Mop floors (photo required)", requiresPhoto: true, sort: 3 },
  });

  await prisma.sopTask.upsert({
    where: { id: "task_closing_4" },
    update: { title: "Lock doors and turn off lights", requiresPhoto: false, sort: 4 },
    create: { id: "task_closing_4", templateId: closingTemplate.id, title: "Lock doors and turn off lights", requiresPhoto: false, sort: 4 },
  });

  console.log("✅ SOP templates and tasks seeded");
}

async function seedSampleQROrders() {
  console.log("Seeding sample QR orders for testing...");

  // Get a table for testing
  const table = await prisma.table.findFirst({
    where: { storeId: STORE_ID },
  });

  if (!table) {
    console.log("⚠️  No tables found, skipping QR order seed");
    return;
  }

  // Get some items for testing
  const americano = await prisma.item.findFirst({
    where: { name: "Americano", storeId: STORE_ID },
  });

  const latte = await prisma.item.findFirst({
    where: { name: "Cafe Latte", storeId: STORE_ID },
  });

  if (!americano || !latte) {
    console.log("⚠️  Sample items not found, skipping QR order seed");
    return;
  }

  // Get some options
  const hotOption = await prisma.option.findFirst({
    where: { name: "Hot", storeId: STORE_ID },
  });

  const mediumOption = await prisma.option.findFirst({
    where: { name: "Medium", storeId: STORE_ID },
  });

  // Get last order number
  const lastOrder = await prisma.order.findFirst({
    where: { storeId: STORE_ID },
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });
  const nextOrderNo = (lastOrder?.orderNo ?? 0) + 1;

  // Sample PAYMONGO order (paid online)
  const paymongoOrder = await prisma.order.create({
    data: {
      storeId: STORE_ID,
      orderNo: nextOrderNo,
      tableId: table.id,
      status: "PLACED",
      source: "QR_PAYMONGO",
      paymentMethod: "PAYMONGO",
      paymentStatus: "PAID",
      customerNote: "Extra hot please",
      items: {
        create: [
          {
            itemId: americano.id,
            qty: 2,
            unitPrice: americano.basePrice,
            options: hotOption && mediumOption ? {
              create: [
                { optionId: hotOption.id, priceDelta: hotOption.priceDelta },
                { optionId: mediumOption.id, priceDelta: mediumOption.priceDelta },
              ],
            } : undefined,
          },
        ],
      },
    },
  });

  console.log(`✅ Sample PAYMONGO order created: #${paymongoOrder.orderNo} (${paymongoOrder.id})`);

  // Sample CASH order (pay at counter)
  const cashOrder = await prisma.order.create({
    data: {
      storeId: STORE_ID,
      orderNo: nextOrderNo + 1,
      tableId: table.id,
      status: "PLACED",
      source: "QR_UNPAID",
      paymentMethod: "CASH",
      paymentStatus: "UNPAID",
      customerNote: "No sugar",
      items: {
        create: [
          {
            itemId: latte.id,
            qty: 1,
            unitPrice: latte.basePrice,
            options: hotOption && mediumOption ? {
              create: [
                { optionId: hotOption.id, priceDelta: hotOption.priceDelta },
                { optionId: mediumOption.id, priceDelta: mediumOption.priceDelta },
              ],
            } : undefined,
          },
        ],
      },
    },
  });

  console.log(`✅ Sample CASH order created: #${cashOrder.orderNo} (${cashOrder.id})`);
  console.log("\n📝 Test URLs:");
  console.log(`   PAYMONGO: http://localhost:3000/pos/register?qrOrderId=${paymongoOrder.id}`);
  console.log(`   CASH:     http://localhost:3000/pos/register?qrOrderId=${cashOrder.id}`);
}

async function main() {
  await ensureStore();
  await seedCategories();
  await seedItems();
  await seedTables();
  await seedSopTemplates();
  await seedStoreConfig();
  await seedStaff();
  await seedSampleQROrders();

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());