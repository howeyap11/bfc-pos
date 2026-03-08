import { requireStaffHook } from "../plugins/staffGuard";
const STORE_ID = "store_1";
export async function registerRoutes(app) {
    // Protect all endpoints with x-staff-key
    // Import the hook function directly to avoid decoration timing issues
    app.addHook("preHandler", requireStaffHook);
    // Get current open register
    app.get("/register/current", async () => {
        const current = await app.prisma.registerSession.findFirst({
            where: { storeId: STORE_ID, status: "OPEN" },
            orderBy: { openedAt: "desc" },
        });
        return { current };
    });
    // Open register
    app.post("/register/open", async (req, reply) => {
        const body = req.body;
        const openingCashCents = Number(body?.openingCashCents ?? 0);
        if (!Number.isFinite(openingCashCents) || openingCashCents < 0) {
            reply.code(400);
            return { error: "INVALID_OPENING_CASH" };
        }
        const existing = await app.prisma.registerSession.findFirst({
            where: { storeId: STORE_ID, status: "OPEN" },
            select: { id: true },
        });
        if (existing) {
            reply.code(409);
            return { error: "REGISTER_ALREADY_OPEN", registerSessionId: existing.id };
        }
        const created = await app.prisma.registerSession.create({
            data: {
                storeId: STORE_ID,
                status: "OPEN",
                openingCash: Math.trunc(openingCashCents),
                note: body?.note?.trim() || null,
            },
        });
        await app.prisma.auditLog.create({
            data: {
                storeId: STORE_ID,
                action: "REGISTER_OPEN",
                entity: "RegisterSession",
                entityId: created.id,
                note: created.note ?? undefined,
            },
        });
        return created;
    });
    // Close register (computes expected + variance)
    app.post("/register/close", async (req, reply) => {
        const body = req.body;
        const closingCashCents = Number(body?.closingCashCents ?? NaN);
        if (!Number.isFinite(closingCashCents) || closingCashCents < 0) {
            reply.code(400);
            return { error: "INVALID_CLOSING_CASH" };
        }
        const open = await app.prisma.registerSession.findFirst({
            where: { storeId: STORE_ID, status: "OPEN" },
            orderBy: { openedAt: "desc" },
        });
        if (!open) {
            reply.code(409);
            return { error: "NO_OPEN_REGISTER" };
        }
        // Cash received in this session for non-void transactions
        const cashIn = await app.prisma.transactionPayment.aggregate({
            where: {
                transaction: { registerSessionId: open.id, status: { not: "VOID" } },
                method: "CASH",
                status: "PAID",
            },
            _sum: { amountCents: true },
        });
        const expectedCash = (open.openingCash ?? 0) + (cashIn._sum.amountCents ?? 0);
        const varianceCash = Math.trunc(closingCashCents) - expectedCash;
        const closed = await app.prisma.registerSession.update({
            where: { id: open.id },
            data: {
                status: "CLOSED",
                closedAt: new Date(),
                closingCash: Math.trunc(closingCashCents),
                expectedCash,
                varianceCash,
                note: body?.note?.trim() || open.note || null,
            },
        });
        await app.prisma.auditLog.create({
            data: {
                storeId: STORE_ID,
                action: "REGISTER_CLOSE",
                entity: "RegisterSession",
                entityId: closed.id,
                note: closed.note ?? undefined,
                metaJson: JSON.stringify({ expectedCash, varianceCash }),
            },
        });
        return closed;
    });
}
