import { downloadPublicMedia, filenameFromUrl } from "@/lib/remote-media";
import { fileLimit, formatMb } from "@/lib/quota";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { ALLOWED_TYPES } from "@/lib/site";
import { guestKeyFromRequest } from "@/lib/posts";

export const maxDuration = 30;

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user ?? null;
  const isMember = Boolean(user);
  const guestKey = isMember ? null : guestKeyFromRequest(request);
  const limitKey = isMember ? `fetch:user:${user!.id}` : `fetch:guest:${guestKey}`;
  if (!rateLimit(limitKey, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Çok fazla deneme. Biraz bekleyip tekrar dene." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { url?: string; kind?: string } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (body?.kind === "video" || body?.kind === "audio") {
    return Response.json(
      { error: "Video ve ses için bağlantı kullanılamaz. Dosyayı cihazından seç." },
      { status: 400 },
    );
  }
  if (!url) {
    return Response.json({ error: "Bir bağlantı yaz." }, { status: 400 });
  }
  const kind = "image" as const;

  const maxBytes = fileLimit(isMember, kind);
  try {
    const file = await downloadPublicMedia(url, maxBytes);
    const meta = ALLOWED_TYPES[file.mime];
    if (!meta || meta.type !== "image") {
      return Response.json(
        { error: "Bu adres bir resim değil. Video ve paylaşım sayfası linkleri eklenmez." },
        { status: 400 },
      );
    }
    const name = filenameFromUrl(file.url, file.mime);
    return new Response(file.buf, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "X-File-Name": encodeURIComponent(name),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dosya alınamadı.";
    if (message.includes("çok büyük")) {
      return Response.json(
        { error: `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(maxBytes)}MB` },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
