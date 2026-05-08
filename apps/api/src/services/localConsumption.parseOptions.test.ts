/**
 * Run: pnpm exec tsx src/services/localConsumption.parseOptions.test.ts
 */
import assert from "node:assert/strict";
import { parseOptionsJson } from "./localConsumption.service.js";

function run() {
  const a = parseOptionsJson(null);
  assert.deepEqual(a, {
    baseType: null,
    sizeLabel: null,
    plainOptionIds: [],
    substituteCloudId: null,
    shotsQty: 0,
  });

  const b = parseOptionsJson("");
  assert.equal(b.shotsQty, 0);

  const c = parseOptionsJson(
    JSON.stringify([
      { type: "size", baseType: "hot", sizeLabel: "M" },
      { type: "shots", qty: 2.7 },
      { id: "opt_a", group: "Milk", name: "Oat" },
    ])
  );
  assert.equal(c.baseType, "HOT");
  assert.equal(c.sizeLabel, "M");
  assert.equal(c.shotsQty, 2);
  assert.deepEqual(c.plainOptionIds, ["opt_a"]);

  const d = parseOptionsJson(
    JSON.stringify([{ type: "substitute", cloudId: "sub_1" }, { id: "x", group: "Size" }])
  );
  assert.equal(d.substituteCloudId, "sub_1");
  assert.deepEqual(d.plainOptionIds, []);

  const e = parseOptionsJson(
    JSON.stringify([{ id: "s1", group: "Shots", name: "Extra" }, { id: "ok", name: "Syrup" }])
  );
  assert.deepEqual(e.plainOptionIds, ["ok"]);

  console.log("localConsumption.parseOptions: ok");
}

run();
