import "dotenv/config";
import { PrismaClient } from "../src/generated/client2/index.js";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const SIZES_GROUP_KEY = "SIZES";
const SIZES_GROUP_NAME = "Sizes";
const MENU_SIZES = [
  { label: "12oz", sortOrder: 0 },
  { label: "16oz", sortOrder: 1 },
  { label: "1-Liter", sortOrder: 2 },
  { label: "Jar", sortOrder: 3 },
];

const AVAILABILITY: Record<string, string[]> = {
  HOT: ["12oz", "16oz"],
  ICED: ["12oz", "16oz", "1-Liter", "Jar"],
  CONCENTRATED: ["1-Liter", "Jar"],
};

// Menu Settings: Sizes (separate from Option Groups)
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

// Legacy "Sizes" option group - required by drink-sizes API and item editor
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
        isSystem: true,
        required: false,
        multi: false,
      },
      include: { options: true },
    });
    console.log("Created Sizes option group");
  }
  for (let i = 0; i < MENU_SIZES.length; i++) {
    const { label } = MENU_SIZES[i];
    const exists = group.options.some((o) => o.name === label);
    if (!exists) {
      await prisma.menuOption.create({
        data: { groupId: group.id, name: label, sortOrder: i },
      });
      console.log("  Added option:", label);
    }
  }
}

async function main() {
  await seedMenuSizes();
  await seedSizesOptionGroup();

  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists:", email);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { email, passwordHash },
  });
  console.log("Created admin user:", email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
