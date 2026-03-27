import type { FastifyRequest, FastifyReply } from "fastify";

export const CLOUD_ADMIN_ROLES = ["ADMIN", "MANAGER"] as const;
export type CloudAdminRole = (typeof CLOUD_ADMIN_ROLES)[number];

export function cloudAdminRoleFromPayload(payload: unknown): CloudAdminRole {
  const r = (payload as { role?: string } | null)?.role;
  if (r === "MANAGER") return "MANAGER";
  return "ADMIN";
}

/** Role from JWT payload (set after jwtVerify). */
export function getCloudAdminRole(req: FastifyRequest): CloudAdminRole {
  return cloudAdminRoleFromPayload(req.user ?? null);
}

export function requireCloudAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (getCloudAdminRole(req) !== "ADMIN") {
    reply.code(403).send({
      error: "FORBIDDEN",
      message: "This action requires an admin (owner) account.",
    });
    return false;
  }
  return true;
}
