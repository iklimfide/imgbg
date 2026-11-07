import { requireAdmin } from "@/lib/admin";
import { getPost, purgePost, restorePost, softDeletePost } from "@/lib/posts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { kod } = await params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const post = await getPost(kod);
  if (!post) {
    return Response.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  if (body?.action === "restore") {
    await restorePost(kod);
    return Response.json({ ok: true });
  }
  if (body?.action === "hide") {
    await softDeletePost(kod);
    return Response.json({ ok: true });
  }
  if (body?.action === "purge") {
    await purgePost(kod);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Geçersiz işlem." }, { status: 400 });
}
