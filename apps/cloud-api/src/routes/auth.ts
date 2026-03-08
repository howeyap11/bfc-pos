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

    const admin = await app.prisma.adminUser.findUnique({
      where: { email },
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
      { sub: admin.id, email: admin.email },
      { expiresIn: "7d" }
    );
    return { token };
  });
}
