import type { PrismaClient } from "../generated/client2";

export async function bumpCatalogVersion(prisma: PrismaClient): Promise<number> {
  const row = await prisma.catalogVersion.findUnique({ where: { id: 1 } });
  if (!row) {
    const created = await prisma.catalogVersion.create({
      data: { id: 1, latestVersion: 1 },
    });
    return created.latestVersion;
  }
  const next = row.latestVersion + 1;
  await prisma.catalogVersion.update({
    where: { id: 1 },
    data: { latestVersion: next },
  });
  return next;
}
