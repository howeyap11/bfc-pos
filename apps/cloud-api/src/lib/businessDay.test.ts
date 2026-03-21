/**
 * Asia/Manila business-day boundary tests.
 * Run with: pnpm exec tsx apps/cloud-api/src/lib/businessDay.test.ts
 *
 * Verifies that transactions at 11:59 PM, 12:00 AM, and 1:00 AM Manila
 * land on the correct business day.
 */

import {
  localBusinessDayToUtcRange,
  localBusinessDateRangeToUtc,
  localBusinessMonthToUtcRange,
} from "./businessDay.js";

function run() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, got: boolean, want: boolean) {
    if (got === want) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ ${name}: got ${got}, want ${want}`);
      failed++;
    }
  }

  function inRange(utcIso: string, range: { start: Date; end: Date }): boolean {
    const t = new Date(utcIso).getTime();
    return t >= range.start.getTime() && t < range.end.getTime();
  }

  console.log("Business day boundaries (Asia/Manila UTC+8)\n");

  // March 20, 2026 in Manila: 00:00 Manila = 2026-03-19T16:00:00.000Z
  const mar20 = localBusinessDayToUtcRange("2026-03-20");

  // 11:59 PM Mar 19 Manila = 2026-03-19T15:59:00.000Z -> previous day, NOT in Mar 20
  assert(
    "11:59 PM Mar 19 Manila (15:59 UTC) NOT in Mar 20",
    inRange("2026-03-19T15:59:00.000Z", mar20),
    false
  );

  // 12:00 AM Mar 20 Manila = 2026-03-19T16:00:00.000Z -> start of Mar 20, IN
  assert(
    "12:00 AM Mar 20 Manila (16:00 UTC) IN Mar 20",
    inRange("2026-03-19T16:00:00.000Z", mar20),
    true
  );

  // 1:00 AM Mar 20 Manila = 2026-03-19T17:00:00.000Z -> IN
  assert(
    "1:00 AM Mar 20 Manila (17:00 UTC) IN Mar 20",
    inRange("2026-03-19T17:00:00.000Z", mar20),
    true
  );

  // 11:59:59 PM Mar 20 Manila = 2026-03-20T15:59:59.999Z -> IN
  assert(
    "11:59:59 PM Mar 20 Manila (15:59:59.999 UTC) IN Mar 20",
    inRange("2026-03-20T15:59:59.999Z", mar20),
    true
  );

  // 12:00 AM Mar 21 Manila = 2026-03-20T16:00:00.000Z -> next day, NOT in Mar 20
  assert(
    "12:00 AM Mar 21 Manila (16:00 UTC) NOT in Mar 20",
    inRange("2026-03-20T16:00:00.000Z", mar20),
    false
  );

  // Date range: Mar 19–20 inclusive
  const range = localBusinessDateRangeToUtc("2026-03-19", "2026-03-20");
  assert(
    "12:00 AM Mar 19 Manila in Mar 19–20 range",
    inRange("2026-03-18T16:00:00.000Z", range),
    true
  );
  assert(
    "11:59 PM Mar 20 Manila in Mar 19–20 range",
    inRange("2026-03-20T15:59:59.999Z", range),
    true
  );
  assert(
    "12:00 AM Mar 21 Manila NOT in Mar 19–20 range",
    inRange("2026-03-20T16:00:00.000Z", range),
    false
  );

  // Monthly: March 2026 in Manila
  const mar2026 = localBusinessMonthToUtcRange(2026, 3);
  assert(
    "12:00 AM Mar 1 Manila IN March 2026",
    inRange("2026-02-28T16:00:00.000Z", mar2026),
    true
  );
  assert(
    "11:59 PM Mar 31 Manila IN March 2026",
    inRange("2026-03-31T15:59:59.999Z", mar2026),
    true
  );
  assert(
    "12:00 AM Apr 1 Manila NOT in March 2026",
    inRange("2026-03-31T16:00:00.000Z", mar2026),
    false
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
