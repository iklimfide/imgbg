import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { fileLimit, formatMb } from "@/lib/quota";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { ALLOWED_TYPES, mimeFromFileName } from "@/lib/site";

const AVATAR_MAX_BYTES = Math.min(fileLimit(true, "image"), 5 * 1024 * 1024);

export async function POST(request: Request) {
  const account = await requireUser();
  if (!account) {
    return Response.json({ error: "Giriş yap." }, { status: 401 });
  }
  if (!isR2Configured()) {
    return Response.json({ error: "Cloudflare R2 henüz ayarlanmadı." }, { status: 503 });
  }
  if (!rateLimit(`avatar:${account.id}`, 10, 10 * 60 * 1000)) {
    return Response.json({ error: "Çok fazla deneme. Biraz bekleyip tekrar dene." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Dosya seçilmedi." }, { status: 400 });
  }
  const mime = file.type || mimeFromFileName(file.name);
  if (!ALLOWED_TYPES[mime] || ALLOWED_TYPES[mime].type !== "image") {
    return Response.json({ error: "JPEG, PNG, WebP veya GIF seç." }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return Response.json(
      { error: `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(AVATAR_MAX_BYTES)}MB` },
      { status: 413 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  const key = `avatars/${account.id}.webp`;
  await uploadToR2(key, body, mime);
  const image = `/api/avatar/${account.id}?v=${Date.now()}`;
  const db = await getDb();
  await db.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, account.id));
  return Response.json({ url: image });
}
