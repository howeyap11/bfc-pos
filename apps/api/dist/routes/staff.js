const STORE_ID = "store_1";
export const staffRoutes = async (app) => {
    // GET /staff - List all staff members
    // Note: Returns passcode and key for local-first PIN validation and API authentication
    app.get("/staff", async (req, reply) => {
        const staff = await app.prisma.staff.findMany({
            where: { storeId: STORE_ID, isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                role: true,
                passcode: true,
                key: true,
                isActive: true,
            },
        });
        return staff;
    });
    // POST /staff/verify-admin-pin - Verify admin PIN without changing session
    // Used for admin gates (transactions, refunds) to verify admin access
    // Does NOT return or change staffKey - only validates admin role + PIN
    app.post("/staff/verify-admin-pin", async (req, reply) => {
        const body = req.body;
        if (!body.pin) {
            return reply.code(400).send({ error: "MISSING_PIN" });
        }
        // Find admin staff with this PIN
        const staff = await app.prisma.staff.findFirst({
            where: {
                passcode: body.pin,
                role: { in: ["ADMIN", "MANAGER"] },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                role: true,
            },
        });
        if (!staff) {
            return reply.code(401).send({ error: "INVALID_PIN", message: "Invalid admin PIN" });
        }
        // Return success with staff info (no key)
        return {
            ok: true,
            staffId: staff.id,
            name: staff.name,
            role: staff.role,
        };
    });
    // POST /staff/login - Validate staff passcode
    app.post("/staff/login", async (req, reply) => {
        const body = req.body;
        if (!body.staffId || !body.passcode) {
            return reply.code(400).send({ error: "MISSING_FIELDS" });
        }
        const staff = await app.prisma.staff.findUnique({
            where: { id: body.staffId },
            select: {
                id: true,
                name: true,
                role: true,
                passcode: true,
                key: true,
                isActive: true,
            },
        });
        if (!staff || !staff.isActive) {
            return reply.code(404).send({ error: "STAFF_NOT_FOUND" });
        }
        if (staff.passcode !== body.passcode) {
            return reply.code(401).send({ error: "INVALID_PASSCODE" });
        }
        // Return staff info (without passcode, but WITH key for API authentication)
        return {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            key: staff.key,
        };
    });
};
