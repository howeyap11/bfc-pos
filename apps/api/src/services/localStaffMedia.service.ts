import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STAFF_MEDIA_ROOT = path.resolve(process.cwd(), "storage", "staff-media");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveStaffMedia(params: {
  folder: "attendance" | "waste";
  fileName: string;
  bytes: Buffer;
}): Promise<string> {
  const dir = path.join(STAFF_MEDIA_ROOT, params.folder);
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${sanitizeFileName(params.fileName)}`;
  const fullPath = path.join(dir, fileName);
  await writeFile(fullPath, params.bytes);
  return fullPath;
}

export function toRelativeStaffMediaPath(fullPath: string): string {
  const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

export function decodeBase64Image(input: string): { bytes: Buffer; ext: string } {
  const trimmed = input.trim();
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(trimmed);
  if (match) {
    const rawExt = (match[1] ?? "jpg").toLowerCase();
    const ext = rawExt === "jpeg" ? "jpg" : rawExt;
    const payload = match[2] ?? "";
    return { bytes: Buffer.from(payload, "base64"), ext };
  }
  // Fallback: raw base64 without data URL.
  return { bytes: Buffer.from(trimmed, "base64"), ext: "jpg" };
}
