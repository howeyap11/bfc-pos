const ADMIN_ROLES = ["ADMIN", "OIC", "AUDITOR", "MANAGER"];
/**
 * Hook that requires staff to have an admin-eligible role.
 * Must run after requireStaff (which attaches req.staff).
 */
async function requireAdminRole(req, reply) {
    const staff = req.staff;
    if (!staff) {
        return reply.code(401).send({ error: "UNAUTHORIZED", message: "Staff auth required" });
    }
    const role = (staff.role || "").toUpperCase();
    if (!ADMIN_ROLES.includes(role)) {
        return reply.code(403).send({
            error: "FORBIDDEN",
            message: "Admin, OIC, or Auditor role required",
        });
    }
}
export function getStoreIdFromBranch(branchId) {
    return branchId === "default" ? "store_1" : branchId;
}
export function getBranchFromRequest(req) {
    const raw = req.headers["x-branch-id"];
    const val = Array.isArray(raw) ? raw[0] : raw;
    return (typeof val === "string" ? val.trim() : "") || "default";
}
export const adminGuardPlugin = async (app) => {
    app.decorate("requireAdmin", async (req, reply) => {
        await app.requireStaff(req, reply);
        if (reply.sent)
            return;
        await requireAdminRole(req, reply);
    });
};
