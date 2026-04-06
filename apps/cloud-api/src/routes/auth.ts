import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { verifyPassword } from "../lib/password.js";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", details: parsed.error.flatten() };
    }
    const { email, password } = parsed.data;

    const admin = await app.prisma.cloudAdminUser.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
    if (!admin) {
      reply.code(401);
      return { error: "INVALID_CREDENTIALS" };
    }

    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) {
      reply.code(401);
      return { error: "INVALID_CREDENTIALS" };
    }

    const token = app.jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      { expiresIn: "7d" }
    );
    return { token, role: admin.role };
  });

  app.get("/me", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401);
      return { error: "UNAUTHORIZED" };
    }
    const payload = req.user;
    const id = payload.sub;
    const row = await app.prisma.cloudAdminUser.findUnique({
      where: { id },
      select: { email: true, role: true },
    });
    if (!row) {
      reply.code(401);
      return { error: "UNAUTHORIZED" };
    }
    return { email: row.email, role: row.role };
  });
}
