/**
 * Sticker decision logic tests.
 * Run with: pnpm exec tsx apps/web/src/lib/sticker.test.ts
 *
 * Logic: when stickerPrintCategoryIds is set, print if line has size/temp OR line's categoryCloudId is in the list.
 * When stickerPrintCategoryIds is missing or empty, print no stickers.
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

  const withCategories = ["cat1"];

  console.log("Sticker decision: category-driven + size/temp\n");

  // No config → no stickers
  assert("no stickerPrintCategoryIds → no print", shouldPrintSticker({ optionsJson: "[]" }), false);
  assert("empty stickerPrintCategoryIds → no print", shouldPrintSticker({ optionsJson: "[]" }, []), false);
  assert("null stickerPrintCategoryIds → no print", shouldPrintSticker({ optionsJson: "[]" }, null), false);

  // With categories set: print when size/temp
  const sizeOpts = JSON.stringify([{ type: "size", baseType: "ICED", sizeLabel: "16oz" }]);
  assert("optionsJson with type=size + categories → print", shouldPrintSticker({ optionsJson: sizeOpts }, withCategories), true);
  assert("baseType+sizeLabel direct + categories → print", shouldPrintSticker({ baseType: "ICED", sizeLabel: "16oz" }, withCategories), true);

  // With categories set: print when categoryCloudId in list
  assert("categoryCloudId in list → print", shouldPrintSticker({ categoryCloudId: "cat1" }, withCategories), true);
  assert("categoryCloudId not in list → no print", shouldPrintSticker({ categoryCloudId: "other" }, withCategories), false);
  assert("no size/temp and no categoryCloudId → no print", shouldPrintSticker({}, withCategories), false);

  // No legacy isDrink/serveVessel
  assert("isDrink/serveVessel no longer used → no print", shouldPrintSticker({ isDrink: true, serveVessel: "PLASTIC_CUP" } as any, withCategories), false);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
