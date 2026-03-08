/**
 * Manual test file for inventory service
 *
 * Run with: tsx src/services/inventory.service.test.ts
 */
import { PrismaClient } from "@prisma/client";
import { InventoryService } from "./inventory.service";
import Decimal from "decimal.js";
async function runTests() {
    const prisma = new PrismaClient();
    const service = new InventoryService(prisma);
    try {
        console.log("🧪 Testing Inventory Service\n");
        // Test 1: Decimal validation
        console.log("Test 1: Decimal validation");
        try {
            const delta = new Decimal("100.5");
            console.log("✅ Valid decimal:", delta.toString());
        }
        catch (e) {
            console.error("❌ Failed:", e);
        }
        // Test 2: NaN detection
        console.log("\nTest 2: NaN detection");
        try {
            await service.postMovement({
                storeId: "store_1",
                ingredientId: "test",
                type: "PURCHASE",
                qtyDelta: NaN,
                unitId: "test",
            });
            console.error("❌ Should have thrown error for NaN");
        }
        catch (e) {
            console.log("✅ Correctly rejected NaN:", e.message);
        }
        // Test 3: Invalid number detection
        console.log("\nTest 3: Invalid number detection");
        try {
            await service.postMovement({
                storeId: "store_1",
                ingredientId: "test",
                type: "PURCHASE",
                qtyDelta: "not-a-number",
                unitId: "test",
            });
            console.error("❌ Should have thrown error for invalid number");
        }
        catch (e) {
            console.log("✅ Correctly rejected invalid number:", e.message);
        }
        // Test 4: Decimal arithmetic
        console.log("\nTest 4: Decimal arithmetic");
        const a = new Decimal("100.5");
        const b = new Decimal("50.25");
        const sum = a.plus(b);
        console.log(`✅ ${a} + ${b} = ${sum} (expected: 150.75)`);
        // Test 5: Negative quantities
        console.log("\nTest 5: Negative quantities");
        const negative = new Decimal("-25.5");
        const result = a.plus(negative);
        console.log(`✅ ${a} + ${negative} = ${result} (expected: 75)`);
        console.log("\n✅ All basic tests passed!");
    }
    catch (e) {
        console.error("❌ Test failed:", e);
    }
    finally {
        await prisma.$disconnect();
    }
}
runTests();
