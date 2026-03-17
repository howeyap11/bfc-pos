/**
 * Shared helper tests: extractSizeTemp + formatSizeTempLine.
 * Run with: pnpm exec tsx apps/web/src/lib/lineItemDisplay.test.ts
 */

import { extractSizeTemp, formatSizeTempLine } from "./lineItemDisplay";

function run() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, got: string, want: string) {
    if (got === want) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ ${name}: got "${got}", want "${want}"`);
      failed++;
    }
  }

  console.log("extractSizeTemp + formatSizeTempLine (direct and optionsJson)\n");

  // Direct fields
  assert(
    "direct: ICED + 16oz → Iced 16oz",
    formatSizeTempLine(extractSizeTemp({ baseType: "ICED", sizeLabel: "16oz" })),
    "Iced 16oz"
  );
  assert(
    "direct: HOT + 12oz → Hot 12oz",
    formatSizeTempLine(extractSizeTemp({ baseType: "HOT", sizeLabel: "12oz" })),
    "Hot 12oz"
  );
  assert("direct: size only → 16oz", formatSizeTempLine(extractSizeTemp({ sizeLabel: "16oz" })), "16oz");
  assert("direct: temp only → Iced", formatSizeTempLine(extractSizeTemp({ baseType: "ICED" })), "Iced");
  assert("direct: CONCENTRATED → Concentrated", formatSizeTempLine(extractSizeTemp({ baseType: "CONCENTRATED", sizeLabel: "12oz" })), "Concentrated 12oz");

  // optionsJson shape
  const opts = JSON.stringify([{ type: "size", baseType: "ICED", sizeLabel: "16oz" }]);
  assert(
    "optionsJson size → Iced 16oz",
    formatSizeTempLine(extractSizeTemp({ optionsJson: opts })),
    "Iced 16oz"
  );

  // Absent
  assert("no item → empty", formatSizeTempLine(extractSizeTemp(null)), "");
  assert("empty item → empty", formatSizeTempLine(extractSizeTemp({})), "");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
