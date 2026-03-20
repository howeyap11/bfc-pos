import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { join, extname } from "path";

type MenuImageItem = {
  id: string;
  imageUrl?: string | null;
};

type CacheIndexEntry = {
  fileName: string;
  sourceUrl: string;
  updatedAt: string;
};

type CacheIndex = Record<string, CacheIndexEntry>;

const CACHE_ROOT = join(process.cwd(), "cache");
const CACHE_DIR = join(CACHE_ROOT, "menu-images");
const INDEX_PATH = join(CACHE_DIR, "index.json");
const VALID_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"]);

let indexLoaded = false;
let cacheIndex: CacheIndex = {};
let saveTimer: NodeJS.Timeout | null = null;

function sanitizeId(input: string): string {
  return (input || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

function extensionFromContentType(contentType: string | null): string | null {
  const normalized = (contentType || "").toLowerCase();
  if (normalized.includes("image/jpeg")) return ".jpg";
  if (normalized.includes("image/png")) return ".png";
  if (normalized.includes("image/webp")) return ".webp";
  if (normalized.includes("image/gif")) return ".gif";
  if (normalized.includes("image/bmp")) return ".bmp";
  if (normalized.includes("image/svg+xml")) return ".svg";
  return null;
}

function extensionFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const ext = extname(parsed.pathname).toLowerCase();
    return VALID_EXTS.has(ext) ? ext : null;
  } catch {
    return null;
  }
}

function toPublicPath(fileName: string): string {
  return `/api/cache/menu-images/${fileName}`;
}

function fromPublicPath(publicPath: string): string {
  return publicPath.replace(/^\/cache\/menu-images\//, "");
}

async function ensureDirs() {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function flushIndex() {
  await ensureDirs();
  await writeFile(INDEX_PATH, JSON.stringify(cacheIndex, null, 2), "utf8");
}

function scheduleIndexSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushIndex().catch(() => {});
  }, 250);
}

async function loadIndex() {
  if (indexLoaded) return;
  await ensureDirs();
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as CacheIndex;
    cacheIndex = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cacheIndex = {};
  }
  indexLoaded = true;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findExistingFileName(itemId: string): Promise<string | null> {
  const safeId = sanitizeId(itemId);
  if (!safeId) return null;
  const files = await readdir(CACHE_DIR);
  const match = files.find((f) => f.startsWith(`${safeId}.`));
  return match ?? null;
}

async function resolveCachedFileName(itemId: string): Promise<string | null> {
  await loadIndex();
  const safeId = sanitizeId(itemId);
  if (!safeId) return null;

  const indexed = cacheIndex[safeId];
  if (indexed) {
    const filePath = join(CACHE_DIR, indexed.fileName);
    if (await fileExists(filePath)) {
      return indexed.fileName;
    }
    delete cacheIndex[safeId];
    scheduleIndexSave();
  }

  const fileName = await findExistingFileName(safeId);
  if (fileName) {
    return fileName;
  }
  return null;
}

async function getCachedEntry(itemId: string): Promise<{ fileName: string; sourceUrl: string } | null> {
  await loadIndex();
  const safeId = sanitizeId(itemId);
  if (!safeId) return null;
  const indexed = cacheIndex[safeId];
  if (!indexed) return null;
  const filePath = join(CACHE_DIR, indexed.fileName);
  if (!(await fileExists(filePath))) return null;
  return { fileName: indexed.fileName, sourceUrl: indexed.sourceUrl };
}

export async function invalidateCachedImage(itemId: string): Promise<void> {
  await loadIndex();
  const safeId = sanitizeId(itemId);
  if (!safeId) return;
  const indexed = cacheIndex[safeId];
  if (!indexed) return;
  const filePath = join(CACHE_DIR, indexed.fileName);
  await unlink(filePath).catch(() => {});
  delete cacheIndex[safeId];
  scheduleIndexSave();
}

export async function cleanupStaleMenuImages(activeCloudIds: string[]): Promise<number> {
  await loadIndex();
  const validKeys = new Set(activeCloudIds.map((id) => sanitizeId(id)).filter(Boolean));
  let removed = 0;
  for (const key of Object.keys(cacheIndex)) {
    if (validKeys.has(key)) continue;
    const indexed = cacheIndex[key];
    if (indexed) {
      const filePath = join(CACHE_DIR, indexed.fileName);
      await unlink(filePath).catch(() => {});
      removed++;
    }
    delete cacheIndex[key];
  }
  if (removed > 0) scheduleIndexSave();
  return removed;
}

export async function initMenuImageCache(): Promise<void> {
  await loadIndex();
}

export async function getCachedMenuImagePublicPath(itemId: string): Promise<string | null> {
  const fileName = await resolveCachedFileName(itemId);
  if (!fileName) return null;
  return toPublicPath(fileName);
}

export async function getImagePath(item: MenuImageItem): Promise<string | null> {
  const fallback = item.imageUrl ?? null;
  const entry = await getCachedEntry(item.id);
  if (entry) {
    if (!fallback || entry.sourceUrl !== fallback) {
      await invalidateCachedImage(item.id);
    } else {
      return toPublicPath(entry.fileName);
    }
  }
  if (!fallback) return null;
  const downloaded = await downloadAndCacheMenuImage(item.id, fallback);
  return downloaded ?? fallback;
}

export async function downloadAndCacheMenuImage(itemId: string, remoteUrl: string): Promise<string | null> {
  if (!remoteUrl) return null;
  const safeId = sanitizeId(itemId);
  if (!safeId) return null;

  await loadIndex();
  const existing = await resolveCachedFileName(safeId);
  if (existing) return toPublicPath(existing);

  let res: Response;
  try {
    res = await fetch(remoteUrl, { signal: AbortSignal.timeout(10000) });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().startsWith("image/")) {
    return null;
  }

  const arr = await res.arrayBuffer();
  const ext = extensionFromContentType(contentType) ?? extensionFromUrl(remoteUrl) ?? ".jpg";
  const fileName = `${safeId}${ext}`;
  const absPath = join(CACHE_DIR, fileName);

  await ensureDirs();
  await writeFile(absPath, Buffer.from(arr));

  const prev = cacheIndex[safeId];
  if (prev && prev.fileName !== fileName) {
    const oldPath = join(CACHE_DIR, prev.fileName);
    await unlink(oldPath).catch(() => {});
  }
  cacheIndex[safeId] = {
    fileName,
    sourceUrl: remoteUrl,
    updatedAt: new Date().toISOString(),
  };
  scheduleIndexSave();
  return toPublicPath(fileName);
}

export async function preloadMissingMenuImages(items: MenuImageItem[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;
  await loadIndex();
  await Promise.allSettled(
    items.map(async (item) => {
      const url = item.imageUrl ?? null;
      if (!item?.id || !url) return;
      const entry = await getCachedEntry(item.id);
      if (entry) {
        if (entry.sourceUrl !== url) await invalidateCachedImage(item.id);
        else return;
      }
      await downloadAndCacheMenuImage(item.id, url);
    })
  );
}

export async function getCachedMenuImageFile(fileName: string): Promise<{ contentType: string; body: Buffer } | null> {
  await ensureDirs();
  const normalized = fromPublicPath(`/cache/menu-images/${fileName}`);
  if (!normalized || normalized.includes("/") || normalized.includes("\\")) {
    return null;
  }
  const absPath = join(CACHE_DIR, normalized);
  if (!(await fileExists(absPath))) return null;

  const ext = extname(normalized).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
      ? "image/webp"
      : ext === ".gif"
      ? "image/gif"
      : ext === ".bmp"
      ? "image/bmp"
      : ext === ".svg"
      ? "image/svg+xml"
      : "image/jpeg";
  const body = await readFile(absPath);
  return { contentType, body };
}
