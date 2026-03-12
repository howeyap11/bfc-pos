import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const SIZES_GROUP_KEY = "SIZES";
const SIZES_GROUP_NAME = "Sizes";
const MENU_SIZES = [
  { label: "12oz", sortOrder: 0 },
  { label: "16oz", sortOrder: 1 },
  { label: "Jar", sortOrder: 2 },
  { label: "1-Liter", sortOrder: 3 },
];

const AVAILABILITY: Record<string, string[]> = {
  HOT: ["12oz", "16oz"],
  ICED: ["12oz", "16oz", "Jar", "1-Liter"],
  CONCENTRATED: ["1-Liter"],
};

// MenuOptionGroup "Sizes" (isSizeGroup) — required by /admin/drink-sizes and item drink-size config
async function seedSizesOptionGroup() {
  let group = await prisma.menuOptionGroup.findFirst({
    where: { name: SIZES_GROUP_NAME, isSizeGroup: true },
    include: { options: true },
  });
  if (!group) {
    group = await prisma.menuOptionGroup.create({
      data: {
        name: SIZES_GROUP_NAME,
        isSizeGroup: true,
        required: false,
        multi: false,
        isSystem: true,
        isDeletable: false,
      },
      include: { options: true },
    });
    console.log("MenuOptionGroup Sizes (drink sizes) created");
  }
  for (const { label, sortOrder } of MENU_SIZES) {
    const existing = group.options.find((o) => o.name === label);
    if (!existing) {
      await prisma.menuOption.create({
        data: { groupId: group.id, name: label, priceDelta: 0, sortOrder },
      });
      console.log("  Added MenuOption (Sizes):", label);
    }
  }
}

// Menu Settings: Sizes (MenuSettingGroup + MenuSize + MenuSizeAvailability)
async function seedMenuSizes() {
  const group = await prisma.menuSettingGroup.upsert({
    where: { key: SIZES_GROUP_KEY },
    create: {
      key: SIZES_GROUP_KEY,
      name: SIZES_GROUP_NAME,
      isSystem: true,
      isDeletable: false,
    },
    update: {},
    include: { menuSizes: true },
  });
  console.log("MenuSettingGroup SIZES ready");

  const sizeMap: Record<string, string> = {};
  for (const { label, sortOrder } of MENU_SIZES) {
    let size = await prisma.menuSize.findFirst({
      where: { groupId: group.id, label },
    });
    if (!size) {
      size = await prisma.menuSize.create({
        data: { groupId: group.id, label, sortOrder },
      });
      console.log("  Added MenuSize:", label);
    }
    sizeMap[label] = size.id;
  }

  for (const [mode, labels] of Object.entries(AVAILABILITY)) {
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i] as string;
      const sizeId = sizeMap[label];
      if (!sizeId) continue;
      await prisma.menuSizeAvailability.upsert({
        where: {
          mode_sizeId: {
            mode: mode as "ICED" | "HOT" | "CONCENTRATED",
            sizeId,
          },
        },
        create: {
          mode: mode as "ICED" | "HOT" | "CONCENTRATED",
          sizeId,
          isEnabled: true,
          sortOrder: i,
        },
        update: { isEnabled: true, sortOrder: i },
      });
    }
    console.log("  Seeded availability for", mode);
  }
}

async function main() {
  await seedSizesOptionGroup();
  await seedMenuSizes();

  const email = process.env.ADMIN_EMAIL ?? "admin@bfc.local";
  const password = process.env.ADMIN_PASSWORD ?? "Yapyap12";

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
  console.log("Admin user ready:", email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
