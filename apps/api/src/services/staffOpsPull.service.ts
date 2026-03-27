import type { PrismaClient } from "@prisma/client";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const STORE_SYNC_SECRET = process.env.STORE_SYNC_SECRET ?? "";
const STORE_ID = "store_1";

function headers(): Record<string, string> {
  return STORE_SYNC_SECRET ? { "x-store-sync-key": STORE_SYNC_SECRET } : {};
}

export async function syncStaffOpsReferenceData(prisma: PrismaClient): Promise<void> {
  if (!CLOUD_URL.trim()) return;
  const base = CLOUD_URL.replace(/\/$/, "");

  const [shiftRes, incentiveRes] = await Promise.all([
    fetch(`${base}/sync/staff-ops/shifts?storeId=${STORE_ID}`, { headers: headers() }),
    fetch(`${base}/sync/staff-ops/incentives?storeId=${STORE_ID}`, { headers: headers() }),
  ]);
  if (shiftRes.ok) {
    const shiftData = (await shiftRes.json()) as { shifts?: Array<any> };
    for (const s of shiftData.shifts ?? []) {
      await prisma.staffShiftLocal.upsert({
        where: { cloudId: s.id },
        update: {
          staffCloudId: s.staffCloudId,
          staffName: s.staffName,
          role: s.role,
          shiftDate: new Date(s.shiftDate),
          startTimeText: s.startTimeText,
          endTimeText: s.endTimeText,
          shiftType: s.shiftType,
          assignedBy: s.assignedBy ?? null,
          status: s.status,
          lastSyncedAt: new Date(),
        },
        create: {
          cloudId: s.id,
          storeId: s.storeId ?? STORE_ID,
          staffCloudId: s.staffCloudId,
          staffName: s.staffName,
          role: s.role,
          shiftDate: new Date(s.shiftDate),
          startTimeText: s.startTimeText,
          endTimeText: s.endTimeText,
          shiftType: s.shiftType,
          assignedBy: s.assignedBy ?? null,
          status: s.status,
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  if (incentiveRes.ok) {
    const incentiveData = (await incentiveRes.json()) as { entries?: Array<any> };
    for (const e of incentiveData.entries ?? []) {
      await prisma.staffIncentiveLedgerLocal.upsert({
        where: { cloudId: e.id },
        update: {
          staffCloudId: e.staffCloudId,
          staffName: e.staffName,
          entryType: e.entryType,
          reason: e.reason,
          amount: e.amount,
          referenceType: e.referenceType ?? null,
          referenceCloudId: e.referenceCloudId ?? null,
          happenedAt: new Date(e.happenedAt),
          lastSyncedAt: new Date(),
        },
        create: {
          cloudId: e.id,
          storeId: e.storeId ?? STORE_ID,
          staffCloudId: e.staffCloudId,
          staffName: e.staffName,
          entryType: e.entryType,
          reason: e.reason,
          amount: e.amount,
          referenceType: e.referenceType ?? null,
          referenceCloudId: e.referenceCloudId ?? null,
          happenedAt: new Date(e.happenedAt),
          lastSyncedAt: new Date(),
        },
      });
    }
  }
}
