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
