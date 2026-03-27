/**
 * Dashboard net sales / refund reconciliation.
 * Run: pnpm exec tsx apps/cloud-api/src/services/dashboard.service.test.ts
 */

import { netSalesCentsForSyncedTransaction } from "./dashboard.service.js";

function run() {
  let passed = 0;
  let failed = 0;

  function assertEq(name: string, got: number, want: number) {
    if (got === want) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ ${name}: got ${got}, want ${want}`);
      failed++;
    }
  }

  console.log("netSalesCentsForSyncedTransaction\n");

  assertEq("no refund", netSalesCentsForSyncedTransaction(1000, 0), 1000);
  assertEq("no refund (undefined)", netSalesCentsForSyncedTransaction(1000, undefined), 1000);
  assertEq("full refund", netSalesCentsForSyncedTransaction(1000, 1000), 0);
  assertEq("partial refund", netSalesCentsForSyncedTransaction(1000, 400), 600);
  assertEq("multiple txs same day (simulated sum)", netSalesCentsForSyncedTransaction(500, 0) + netSalesCentsForSyncedTransaction(800, 200), 1100);
  assertEq("refund count metric unchanged — gross refund still separate", netSalesCentsForSyncedTransaction(1000, 300), 700);

  // Pathological: over-refund clamped per POS summary behavior
  assertEq("over-refund clamps net to 0", netSalesCentsForSyncedTransaction(100, 150), 0);

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
