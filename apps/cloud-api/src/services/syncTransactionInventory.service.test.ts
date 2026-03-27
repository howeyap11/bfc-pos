/**
 * Run: pnpm run test:sync-inventory (from apps/cloud-api)
 */
import { parseOptionsJson } from "./syncTransactionInventory.service.js";

function run() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, cond: boolean, detail?: string) {
    if (cond) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ ${name}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  console.log("parseOptionsJson\n");

  const empty = parseOptionsJson(null);
  assert("null options", empty.plainOptionIds.length === 0 && !empty.substituteCloudId);

  const sized = parseOptionsJson(
    JSON.stringify([
      { id: "opt1", name: "Tall", group: "Size", priceDelta: 0 },
      { type: "size", baseType: "ICED", sizeLabel: "Tall" },
      { id: "opt2", name: "Extra shot", group: "Shots", priceDelta: 4000 },
    ])
  );
  assert("size group id excluded", !sized.plainOptionIds.includes("opt1"));
  assert("shot group id excluded", !sized.plainOptionIds.includes("opt2"));
  assert("baseType ICED", sized.baseType === "ICED");
  assert("sizeLabel Tall", sized.sizeLabel === "Tall");

  const sub = parseOptionsJson(
    JSON.stringify([{ type: "substitute", cloudId: "sub_cuid_1" }, { id: "addon1", name: "Syrup", group: "Add-ons", priceDelta: 0 }])
  );
  assert("substitute cloudId", sub.substituteCloudId === "sub_cuid_1");
  assert("add-on id kept", sub.plainOptionIds.includes("addon1"));

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
