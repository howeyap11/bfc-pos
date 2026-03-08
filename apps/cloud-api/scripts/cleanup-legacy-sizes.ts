/**
 * One-time cleanup: remove legacy "Sizes" OptionGroup and its options.
 * Safe no-op if the group does not exist.
 *
 * Run: npx tsx scripts/cleanup-legacy-sizes.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const group = await prisma.menuOptionGroup.findFirst({
    where: { name: "Sizes" },
    include: { options: true },
  });

  if (!group) {
    console.log("Legacy Sizes option group not found; nothing to clean up.");
    return;
  }

  await prisma.menuOptionGroup.delete({ where: { id: group.id } });
  console.log(`Removed legacy Sizes option group and ${group.options.length} option(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
