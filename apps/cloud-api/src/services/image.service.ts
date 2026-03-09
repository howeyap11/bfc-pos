import sharp from "sharp";

/**
 * Optimize image: resize to max width 800px, convert to WebP, quality 80.
 * Maintains aspect ratio. Does not enlarge if already smaller.
 */
export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
