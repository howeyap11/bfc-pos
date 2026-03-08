import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { syncCatalogFromCloud, requireAdminRole } from "../../services/syncCatalog.service.js";

function getBranchFromRequest(req: FastifyRequest): string {
  const raw = req.headers["x-branch-id"];
  const val = Array.isArray(raw) ? raw[0] : raw;
  return (typeof val === "string" ? val.trim() : "") || "default";
}

export async function adminSyncRoutes(app: FastifyInstance) {
  app.post(
    "/admin/sync/catalog",
    {
      preHandler: [
        app.requireStaff,
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (!requireAdminRole(req as { staff?: { role?: string } })) {
            return reply.code(403).send({
              error: "FORBIDDEN",
              message: "Admin role required",
            });
          }
        },
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const branchId = getBranchFromRequest(req);
      const outcome = await syncCatalogFromCloud(app.prisma, branchId);

      if (!outcome.ok) {
        reply.code(outcome.code);
        return { error: outcome.error };
      }

      return {
        latestVersion: outcome.result.latestVersion,
        itemsUpserted: outcome.result.itemsUpserted,
        ingredientsUpserted: outcome.result.ingredientsUpserted,
        recipeLinesUpserted: outcome.result.recipeLinesUpserted,
      };
    }
  );
}
