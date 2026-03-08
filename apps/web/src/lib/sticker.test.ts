/**
 * Sticker decision logic tests.
 * Run with: pnpm exec tsx apps/web/src/lib/sticker.test.ts
 */

import { shouldPrintSticker } from "./sticker";

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

  console.log("Sticker decision: (1) has size in optionsJson OR (2) isDrink && serveVessel === 'PLASTIC_CUP'\n");

  // Print stickers: line with size selection (baseType + sizeLabel in optionsJson)
  const sizeOpts = JSON.stringify([{ type: "size", baseType: "ICED", sizeLabel: "16oz" }]);
  assert("optionsJson with type=size → print", shouldPrintSticker({ optionsJson: sizeOpts }), true);
  assert("optionsJson with type=size (no isDrink) → print", shouldPrintSticker({ optionsJson: sizeOpts }), true);

  // Legacy: plastic cup drinks
  assert("isDrink=true, serveVessel=PLASTIC_CUP → print", shouldPrintSticker({ isDrink: true, serveVessel: "PLASTIC_CUP" }), true);

  // Do NOT print: glass drinks
  assert("isDrink=true, serveVessel=GLASS → no print", shouldPrintSticker({ isDrink: true, serveVessel: "GLASS" }), false);

  // Do NOT print: other vessel
  assert("isDrink=true, serveVessel=OTHER → no print", shouldPrintSticker({ isDrink: true, serveVessel: "OTHER" }), false);

  // Do NOT print: non-drinks
  assert("isDrink=false → no print", shouldPrintSticker({ isDrink: false, serveVessel: "PLASTIC_CUP" }), false);
  assert("isDrink=undefined → no print", shouldPrintSticker({ serveVessel: "PLASTIC_CUP" }), false);

  // Do NOT print: missing serveVessel
  assert("serveVessel=null → no print", shouldPrintSticker({ isDrink: true, serveVessel: null }), false);
  assert("serveVessel=undefined → no print", shouldPrintSticker({ isDrink: true }), false);

  // No special cases or item names
  assert("empty line → no print", shouldPrintSticker({}), false);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
