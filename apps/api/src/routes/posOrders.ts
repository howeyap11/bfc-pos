import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const PosOrdersQuery = z.object({
  tab: z.enum(["pending", "qr"]).default("qr"),
});

export const posOrdersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/pos/orders", { preHandler: app.requireStaff }, async (req, reply) => {
    const parsed = PosOrdersQuery.safeParse(req.query);
    const tab = parsed.success ? parsed.data.tab : "qr";

    const orders = await app.prisma.order.findMany({
      where: {
        storeId: "store_1",
        ...(tab === "qr"
          ? {
              status: "PLACED",
              source: { in: ["QR_UNPAID", "QR_PAYMONGO"] },
            }
          : {
              status: { in: ["PLACED", "ACCEPTED", "IN_PREP", "READY"] },
            }),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        table: { include: { zone: true } },
        items: {
          include: {
            item: {
              include: {
                category: true,
                images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1 },
              },
            },
            options: { include: { option: { include: { group: true } } } },
          },
        },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      source: o.source,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      customerNote: o.customerNote,
      createdAt: o.createdAt,
      table: o.table
        ? {
            id: o.table.id,
            label: o.table.label,
            zone: o.table.zone ? { code: o.table.zone.code, name: o.table.zone.name } : null,
          }
        : null,
      items: o.items.map((oi) => ({
        id: oi.id,
        qty: oi.qty,
        unitPrice: oi.unitPrice,
        lineNote: oi.lineNote,
        item: oi.item
          ? {
              id: oi.item.id,
              name: oi.item.name,
              category: oi.item.category
                ? { name: oi.item.category.name, prepArea: oi.item.category.prepArea }
                : null,
              imageUrl: oi.item.images[0]?.url ?? null,
            }
          : null,
        options: oi.options.map((opt) => ({
          id: opt.id,
          option: opt.option
            ? { name: opt.option.name, group: opt.option.group ? { name: opt.option.group.name } : null }
            : null,
        })),
      })),
    }));
  });
};
