/**
 * One-off script to log current DB state for P3005 baseline.
 * Run: cd apps/api && npx tsx prisma/debug-migrate-state.ts
 */
import "dotenv/config";
import path from "path";
import { PrismaClient } from "@prisma/client";

const LOG_PATH = path.join(process.cwd(), process.cwd().endsWith("api") ? ".." : "", "debug-312ecb.log");
const INGEST = "http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a";
const SESSION = "312ecb";

async function log(payload: Record<string, unknown>) {
  const line = JSON.stringify({ sessionId: SESSION, ...payload, timestamp: Date.now() }) + "\n";
  try {
    await fetch(INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
      body: JSON.stringify({ sessionId: SESSION, location: "debug-migrate-state.ts", message: payload.message as string, data: payload.data, timestamp: Date.now() }),
    }).catch(() => {});
  } catch (_) {}
  const fs = await import("fs");
  fs.appendFileSync(LOG_PATH, line);
  console.log("[debug]", payload.message, payload.data);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<{ name: string }[]>`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
    await log({
      message: "DB tables",
      data: { tables: tables.map((t) => t.name), count: tables.length },
      hypothesisId: "H1",
    });
    const hasPrismaMigrations = tables.some((t) => t.name === "_prisma_migrations");
    await log({
      message: "_prisma_migrations exists",
      data: { hasPrismaMigrations },
      hypothesisId: "H2",
    });
    if (hasPrismaMigrations) {
      const rows = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at`;
      await log({
        message: "Applied migrations",
        data: { migration_names: rows.map((r) => r.migration_name) },
        hypothesisId: "H3",
      });
    }
    const staffColumns = await prisma.$queryRaw<{ name: string }[]>`PRAGMA table_info(Staff)`;
    await log({
      message: "Staff table columns",
      data: { columns: staffColumns.map((c) => c.name) },
      hypothesisId: "H4",
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
