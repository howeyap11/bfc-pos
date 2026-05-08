function getTrimmedStaffKey(req) {
    const incomingRaw = req.headers["x-staff-key"];
    const incoming = Array.isArray(incomingRaw) ? incomingRaw[0] : incomingRaw;
    return typeof incoming === "string" ? incoming.trim() : "";
}
/**
 * Validates x-staff-key when present; attaches req.staff or sends 401/500.
 * Returns false if reply was already sent.
 */
async function attachStaffFromKey(app, req, reply, incomingKey) {
    try {
        const staff = await app.prisma.staff.findUnique({
            where: { key: incomingKey },
        });
        if (!staff || !staff.key) {
            console.error("[StaffGuard] UNAUTHORIZED - Invalid key", {
                keyPreview: incomingKey.slice(0, 10) + "...",
                keyLength: incomingKey.length,
                staffFound: !!staff,
                staffHasKey: staff?.key ? true : false,
            });
            void reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid staff key" });
            return false;
        }
        if (!staff.isActive) {
            console.error("[StaffGuard] UNAUTHORIZED - Staff inactive", {
                staffId: staff.id,
                staffName: staff.name,
            });
            void reply.code(401).send({ error: "UNAUTHORIZED", message: "Staff account is inactive" });
            return false;
        }
        console.log("[StaffGuard] Authorized", {
            staffId: staff.id,
            staffName: staff.name,
            staffRole: staff.role,
        });
        const payload = {
            id: staff.id,
            cloudId: staff.cloudId ?? null,
            name: staff.name,
            role: staff.role,
            storeId: staff.storeId,
        };
        req.staff = payload;
        return true;
    }
    catch (err) {
        console.error("[StaffGuard] Database error", err);
        void reply.code(500).send({ error: "INTERNAL_ERROR", message: "Failed to validate staff" });
        return false;
    }
}
/**
 * Staff guard hook function — x-staff-key required for POS register, transactions, etc.
 */
function createRequireStaffHook(app) {
    return async function requireStaffHook(req, reply) {
        const incomingKey = getTrimmedStaffKey(req);
        console.log("[StaffGuard]", {
            method: req.method,
            url: req.url,
            hasIncoming: !!incomingKey,
            incomingLength: incomingKey.length,
        });
        if (!incomingKey) {
            console.error("[StaffGuard] UNAUTHORIZED - No x-staff-key header");
            void reply.code(401).send({ error: "UNAUTHORIZED", message: "Missing x-staff-key header" });
            return;
        }
        const ok = await attachStaffFromKey(app, req, reply, incomingKey);
        if (!ok)
            return;
    };
}
/**
 * When x-staff-key is omitted: allow (tablet / kitchen kiosk read + bump).
 * When present: must be a valid active staff key (same rules as requireStaff).
 */
function createOptionalStaffHook(app) {
    return async function optionalStaffHook(req, reply) {
        const incomingKey = getTrimmedStaffKey(req);
        const r = req;
        if (!incomingKey) {
            r.staff = null;
            return;
        }
        const ok = await attachStaffFromKey(app, req, reply, incomingKey);
        if (!ok)
            return;
    };
}
/**
 * Export a hook function that can be used in route files.
 * Note: This will be initialized by the plugin.
 */
export let requireStaffHook;
export const staffGuardPlugin = async (app) => {
    requireStaffHook = createRequireStaffHook(app);
    app.decorate("requireStaff", requireStaffHook);
    app.decorate("optionalStaff", createOptionalStaffHook(app));
};
