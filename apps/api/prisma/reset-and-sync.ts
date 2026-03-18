/**
 * Clear local POS data and resync everything from Cloud Admin.
 * 1. Resets the database (migrate reset: drop, apply migrations, run seed).
 * 2. Runs full catalog sync from Cloud (menu, staff, transaction types, etc.).
 *
 * Run from apps/api: npx tsx prisma/reset-and-sync.ts
 * Or from repo root: pnpm --filter @bfc/api db:reset-and-sync
 *
 * Requires: CLOUD_URL set and Cloud Admin API running with catalog data.
 *
 * Cloud Admin (apps/cloud-api): To reset that DB, run migrations + seed there
 * (e.g. prisma migrate reset; pnpm db:seed). No separate reset-and-sync script.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: apiRoot, shell: true });
}

async function main() {
  console.log("[reset-and-sync] 1. Resetting database (migrate reset + seed)...");
  run("npx prisma migrate reset --force");

  console.log("[reset-and-sync] 2. Syncing catalog from Cloud Admin...");
  const { syncCatalogFromCloud } = await import("../src/services/syncCatalog.service.js");
  const prisma = new PrismaClient();
  try {
    const outcome = await syncCatalogFromCloud(prisma, "default");
    if (!outcome.ok) {
      console.error("[reset-and-sync] Sync failed:", outcome.error);
      process.exit(1);
    }
    console.log("[reset-and-sync] Sync complete:", outcome.result);
  } finally {
    await prisma.$disconnect();
  }

  console.log("[reset-and-sync] Done. Database cleared and resynced from Cloud.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
