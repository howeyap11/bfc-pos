/**
 * In-memory latest customer display snapshot for the local POS machine.
 * Survives only for the apps/api process lifetime (no DB). Kiosk windows
 * sync via GET/POST instead of shared browser localStorage.
 */

let latestSnapshot: unknown = null;

export function setCustomerDisplaySnapshot(body: unknown): void {
  latestSnapshot = body;
}

export function getCustomerDisplaySnapshotState(): unknown {
  return latestSnapshot;
}
