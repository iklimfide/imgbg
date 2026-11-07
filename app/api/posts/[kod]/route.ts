import { getPost, setPostHidden, softDeletePost } from "@/lib/posts";
import { requireUser } from "@/lib/session";
import { isDeleteTokenValid } from "@/lib/unlock";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  const account = await requireUser();
  const post = await getPost(kod);
  if (!post) {
    return Response.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  if (!account || post.userId !== account.id) {
    return Response.json({ error: "Bu dosyayı gizleyemezsin." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { hidden?: boolean } | null;
  await setPostHidden(kod, Boolean(body?.hidden));
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token ?? request.headers.get("x-delete-token") ?? undefined;

  const post = await getPost(kod);
  if (!post) {
    return Response.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }

  const owner = Boolean(user && post.userId === user.id);
  if (!owner && !isDeleteTokenValid(kod, token)) {
    return Response.json({ error: "Bu dosyayı silemezsin." }, { status: 403 });
  }

  if (!post.deletedAt) {
    await softDeletePost(kod);
  }
  return Response.json({ ok: true });
}
