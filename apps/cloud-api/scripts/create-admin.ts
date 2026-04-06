import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const DEFAULT_EMAIL = "admin@bfc.local";
const DEFAULT_PASSWORD = "admin123";

async function main() {
  const existing = await prisma.adminUser.findUnique({
    where: { email: DEFAULT_EMAIL },
  });
  if (existing) {
    console.log("Admin user already exists:", DEFAULT_EMAIL);
    process.exit(0);
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  await prisma.adminUser.create({
    data: { email: DEFAULT_EMAIL, passwordHash },
  });
  console.log("Created admin user:", DEFAULT_EMAIL);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
