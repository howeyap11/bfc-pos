import type { FastifyPluginAsync, FastifyRequest, FastifyReply, FastifyInstance } from "fastify";

/**
 * Staff guard hook function.
 * Validates x-staff-key header against Staff table in database.
 * 
 * This function is created by the plugin and has access to the Fastify instance.
 */
function createRequireStaffHook(app: FastifyInstance) {
  return async function requireStaffHook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Normalize incoming header - handle string[] case (duplicate headers)
    const incomingRaw = req.headers["x-staff-key"];
    const incoming = Array.isArray(incomingRaw) ? incomingRaw[0] : incomingRaw;
    
    // Trim and validate
    const incomingKey = typeof incoming === "string" ? incoming.trim() : "";

    console.log("[StaffGuard]", {
      method: req.method,
      url: req.url,
      hasIncoming: !!incomingKey,
      incomingLength: incomingKey.length,
      incomingType: Array.isArray(incomingRaw) ? "array" : typeof incomingRaw,
      keyPreview: incomingKey ? `${incomingKey.slice(0, 10)}...` : "NONE",
    });

    if (!incomingKey) {
      console.error("[StaffGuard] UNAUTHORIZED - No x-staff-key header", {
        rawHeaderType: Array.isArray(incomingRaw) ? "array" : typeof incomingRaw,
        rawHeaderValue: incomingRaw,
      });
      return reply.code(401).send({ error: "UNAUTHORIZED", message: "Missing x-staff-key header" });
    }

    // Validate against database
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
        return reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid staff key" });
      }

      if (!staff.isActive) {
        console.error("[StaffGuard] UNAUTHORIZED - Staff inactive", {
          staffId: staff.id,
          staffName: staff.name,
        });
        return reply.code(401).send({ error: "UNAUTHORIZED", message: "Staff account is inactive" });
      }

      console.log("[StaffGuard] Authorized", {
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
      });

      // Attach full staff info to request
      (req as any).staff = {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        storeId: staff.storeId,
      };
    } catch (err) {
      console.error("[StaffGuard] Database error", err);
      return reply.code(500).send({ error: "INTERNAL_ERROR", message: "Failed to validate staff" });
    }
  };
}

/**
 * Export a hook function that can be used in route files.
 * Note: This will be initialized by the plugin.
 */
export let requireStaffHook: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

export const staffGuardPlugin: FastifyPluginAsync = async (app) => {
  // Create the hook with access to the Fastify instance (for Prisma)
  requireStaffHook = createRequireStaffHook(app);
  
  // Decorate the Fastify instance with requireStaff hook
  app.decorate("requireStaff", requireStaffHook);
};
