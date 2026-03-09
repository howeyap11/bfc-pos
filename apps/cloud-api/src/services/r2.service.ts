import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { optimizeImage } from "./image.service.js";

const R2_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

function getR2Config(): {
  s3: S3Client;
  bucket: string;
  publicUrl: string;
} {
  const missing = R2_VARS.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!.trim();
  const publicUrl = process.env.R2_PUBLIC_URL!.trim();
  if (!bucket || !publicUrl) {
    throw new Error("R2_BUCKET and R2_PUBLIC_URL must be non-empty");
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return { s3, bucket, publicUrl };
}

let _config: ReturnType<typeof getR2Config> | null = null;

function getConfig(): ReturnType<typeof getR2Config> {
  if (!_config) _config = getR2Config();
  return _config;
}

/**
 * Log R2 config status at startup. Never logs secret values.
 */
export function logR2Status(log: { info: (msg: string) => void }): void {
  const hasAll = R2_VARS.every((k) => !!process.env[k]?.trim());
  const bucket = process.env.R2_BUCKET?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  log.info(
    `R2: enabled=${hasAll}, bucket=${bucket ? "yes" : "no"}, publicUrl=${publicUrl ? "yes" : "no"}`
  );
}

/**
 * Optimize image and upload to Cloudflare R2.
 * Resizes to max 800px width, converts to WebP (quality 80).
 * Key format: images/<timestamp>-<base>.webp
 * Returns the public URL.
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  _contentType: string
): Promise<string> {
  const { s3, bucket, publicUrl } = getConfig();
  const optimized = await optimizeImage(buffer);
  const base = filename.replace(/\.[^.]+$/, "") || "image";
  const timestamp = Date.now();
  const key = `images/${timestamp}-${base}.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimized,
      ContentType: "image/webp",
    })
  );

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}
