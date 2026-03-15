/**
 * Baseline existing DB (mark all migrations before staff cloudId as applied) then deploy.
 * Use when you get P3005 "database is not empty".
 * Run from repo root: pnpm --filter @bfc/api db:baseline
 * Or from apps/api: npx tsx prisma/baseline-and-deploy.ts
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const migrationsToBaseline = [
  "20260228062211_add_store_pos",
  "20260301035949_add_refunds_and_fix_schema",
  "20260302155513_add_inventory_system",
  "20260303025023_add_local_outbox",
  "20260304100000_add_item_cloud_id",
  "20260304120000_add_cloud_catalog_cache_tables",
  "20260305010000_add_drink_fields_store",
  "20260305100000_add_cloud_menu_item_sizes",
  "20260308000000_add_cloud_menu_item_drink_size_config",
  "20260309000000_add_cloud_store_setting",
  "20260310000000_cloud_menu_item_substitute_per_item_config",
  "20260325000000_add_cloud_menu_item_shots",
  "20260326000000_add_catalog_sync_parity",
  "20260327000000_add_cloud_addons_substitutes",
  "20260328000000_add_cloud_substitute_price",
  "20260329000000_add_cloud_substitute_recipe_consumption",
  "20260330000000_cleanup_substitute_legacy_pos",
];

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: apiRoot, shell: true });
}

console.log("[baseline] Marking existing migrations as applied...");
for (const name of migrationsToBaseline) {
  try {
    run(`npx prisma migrate resolve --applied "${name}"`);
  } catch (e) {
    console.warn(`[baseline] resolve ${name} skipped (may already be applied):`, (e as Error).message);
  }
}
console.log("[baseline] Applying pending migrations...");
run("npx prisma migrate deploy");
console.log("[baseline] Done.");
