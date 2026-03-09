#!/usr/bin/env node
/**
 * Cloud startup: migrate deploy, db seed, then start server.
 * Logs each step for Railway/deployment debugging.
 */
import { execSync } from "node:child_process";

const opts = { stdio: "inherit" };

console.log("[cloud-start] migrate deploy started");
try {
  execSync("prisma migrate deploy", opts);
  console.log("[cloud-start] migrate deploy success");
} catch (e) {
  console.error("[cloud-start] migrate deploy FAILED:", e?.message ?? e);
  process.exit(1);
}

console.log("[cloud-start] db seed started");
try {
  execSync("prisma db seed", opts);
  console.log("[cloud-start] db seed success");
} catch (e) {
  console.error("[cloud-start] db seed FAILED:", e?.message ?? e);
  process.exit(1);
}

console.log("[cloud-start] starting server");
execSync("node dist/index.js", opts);
