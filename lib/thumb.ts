import { toThumb } from "@/lib/convert-image";
import { bufferFromR2, headFromR2, thumbR2Key, uploadToR2 } from "@/lib/r2";

export async function ensureThumb(r2Key: string) {
  const key = thumbR2Key(r2Key);
  const existing = await headFromR2(key);
  if (existing && existing.size > 0) {
    return key;
  }
  const original = await bufferFromR2(r2Key);
  if (!original) {
    throw new Error("Kaynak dosya yok.");
  }
  const thumb = await toThumb(original);
  await uploadToR2(key, thumb, "image/webp");
  return key;
}

export async function saveThumbBytes(r2Key: string, input: Buffer) {
  const key = thumbR2Key(r2Key);
  const thumb = await toThumb(input);
  await uploadToR2(key, thumb, "image/webp");
  return key;
}
