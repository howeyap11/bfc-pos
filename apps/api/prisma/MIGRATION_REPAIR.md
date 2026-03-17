# apps/api Prisma migration history repair

## Diagnosis: broken historical migrations

| Migration | Why it was broken | Fix applied |
|-----------|------------------|-------------|
| **20260304120000_add_cloud_catalog_cache_tables** | Referenced `CloudMenuItem` in ALTER before the table existed in migration history (table was created outside migrations). | Added `CREATE TABLE "CloudMenuItem"` at top of migration with base columns, then existing ALTERs. |
| **20260310000000_cloud_menu_item_substitute_per_item_config** | ALTERed `CloudMenuItemSubstitute` before it existed (that table is created in 20260327000000). | Replaced ALTERs with no-op `SELECT 1;`. Added `priceCents` and `recipeQtyMl` to CREATE in 20260327000000. |
| **20260326000000_add_catalog_sync_parity** | Referenced `CloudIngredient` in ALTER before the table existed in migration history. | Added `CREATE TABLE "CloudIngredient"` at top with base columns, then existing ALTER for `imageUrl`. |
| **20260309000000_add_cloud_store_setting** | Used `TIMESTAMP(3)` which SQLite does not support. | Changed `TIMESTAMP(3)` to `DATETIME`. |
| **20260328000000_add_cloud_substitute_price** | Used `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` (not supported in SQLite) and `TIMESTAMP(3)`. | Inlined FKs in `CREATE TABLE`; changed timestamps to `DATETIME`; removed ALTER CONSTRAINT lines. |
| **20260329000000_add_cloud_substitute_recipe_consumption** | Used `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` (not supported in SQLite). | Inlined FKs in `CREATE TABLE`; removed ALTER CONSTRAINT lines. |
| **20260315070552_verify_repair** (removed) | (1) Ran before 20260326/20260327 so tables CloudIngredient, CloudMenuItem, etc. did not exist on replay. (2) Used `DROP INDEX "sqlite_autoindex_*"` – SQLite does not allow dropping indexes that back UNIQUE/PRIMARY KEY (P3018). | Removed migration folder entirely. Replaced by **20260403000000_schema_parity** which runs after 20260402 (all tables exist) and contains no DROP INDEX on sqlite_autoindex_* (only table redefines and new tables). |

## Files changed

- `prisma/migrations/20260304120000_add_cloud_catalog_cache_tables/migration.sql` – prepended CREATE TABLE CloudMenuItem.
- `prisma/migrations/20260310000000_cloud_menu_item_substitute_per_item_config/migration.sql` – made no-op; columns moved to 20260327000000.
- `prisma/migrations/20260326000000_add_catalog_sync_parity/migration.sql` – prepended CREATE TABLE CloudIngredient.
- `prisma/migrations/20260309000000_add_cloud_store_setting/migration.sql` – TIMESTAMP(3) → DATETIME.
- `prisma/migrations/20260328000000_add_cloud_substitute_price/migration.sql` – FKs inline in CREATE; TIMESTAMP(3) → DATETIME; removed ALTER CONSTRAINT.
- `prisma/migrations/20260329000000_add_cloud_substitute_recipe_consumption/migration.sql` – FKs inline in CREATE; removed ALTER CONSTRAINT.
- `prisma/migrations/20260327000000_add_cloud_addons_substitutes/migration.sql` – (earlier) CloudMenuItemSubstitute created with priceCents and recipeQtyMl.
- **Removed:** `prisma/migrations/20260315070552_verify_repair/` (entire folder).
- **Added:** `prisma/migrations/20260403000000_schema_parity/migration.sql` – same content as verify_repair but (1) runs after 20260402 so all tables exist, (2) no DROP INDEX sqlite_autoindex_* (SQLite-safe).

Staff.email is already added by `20260402000000_staff_email/migration.sql`; no change. Schema and sync code already support Staff.email and cloudId.

## Commands to run (in order)

1. **Reset local SQLite DB and replay all migrations from zero** (required because migration history was repaired; existing dev.db may have been created with different/partial migrations):

   ```bash
   cd apps/api
   pnpm exec prisma migrate reset
   ```

   When prompted, confirm with `y`. This drops `prisma/dev.db`, recreates it, and applies every migration in order. Use only for local dev.

2. **Regenerate Prisma client** (if not already done by reset):

   ```bash
   pnpm exec prisma generate
   ```

3. **Optional: create a new migration in the future** (e.g. for further schema changes):

   ```bash
   pnpm exec prisma migrate dev --name your_migration_name
   ```

## Was local dev.db reset?

**Yes.** After repairing migration history, the only reliable way to get a consistent SQLite database is to run `prisma migrate reset`. That way the shadow DB and real DB are both built from the same repaired migration chain. Existing dev.db may have had tables created manually or by migrations that no longer match the repaired files, so reset is required.

## Sync and register login

- `syncCatalog.service.ts` already upserts staff with `name`, `email`, `passcode`, `role`, `isActive`, `cloudId`; no code change.
- Seed skips staff rows that have `cloudId` set, so synced staff are not overwritten.
- Register login uses the same `Staff` table; after sync, cloud-defined PINs and deactivations apply.

## Remaining TODOs

- None for migration repair. Optional: run `prisma migrate dev` once after reset to confirm no further shadow DB errors.
