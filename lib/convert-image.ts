import sharp from "sharp";

export async function toWebp(input: Buffer) {
  const meta = await sharp(input, { animated: true, failOn: "none" }).metadata();
  const animated = (meta.pages ?? 1) > 1;
  const pipeline = sharp(input, { animated, failOn: "none" });
  if (!animated) {
    pipeline.rotate();
  }
  return pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
}
