import type { FastifyInstance } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";
import {
  getCustomerDisplaySnapshotState,
  setCustomerDisplaySnapshot,
} from "../services/customerDisplayState.service.js";

const DEFAULT_STATE = {
  mode: "idle",
  activeItemPreview: null,
  latestAddedItemPreview: null,
  cartItems: [],
  totalCents: 0,
  lastAddedAt: null,
  ts: 0,
};

export async function posCustomerDisplayRoutes(app: FastifyInstance) {
  /** Read-only: customer kiosk has no staff session */
  app.get("/pos/customer-display/state", async () => {
    const s = getCustomerDisplaySnapshotState();
    if (s == null || typeof s !== "object") {
      return DEFAULT_STATE;
    }
    return s;
  });

  /** Writes from POS Register only (staff-authenticated) */
  app.post("/pos/customer-display/state", { preHandler: requireStaffHook }, async (req, reply) => {
    const body = req.body;
    if (body == null || typeof body !== "object") {
      return reply.code(400).send({ error: "INVALID_BODY" });
    }
    setCustomerDisplaySnapshot(body);
    return { ok: true };
  });
}
