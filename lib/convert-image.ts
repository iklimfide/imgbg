export async function toThumb(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return Buffer.from(
    await sharp(input, { failOn: "none", animated: false, pages: 1 })
      .rotate()
      .resize(384, 384, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 68, effort: 4 })
      .toBuffer(),
  );
}

export async function toWebp(input: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(input, { animated: true, failOn: "none" }).metadata();
    const animated = (meta.pages ?? 1) > 1;
    const pipeline = sharp(input, { animated, failOn: "none" });
    if (!animated) {
      pipeline.rotate();
    }
    return Buffer.from(await pipeline.webp({ quality: 82, effort: 4 }).toBuffer());
  } catch {
    return input;
  }
}
