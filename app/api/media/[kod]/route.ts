import { isAdminEmail } from "@/lib/admin";
import { getPost, isPubliclyVisible } from "@/lib/posts";
import { getFromR2, isR2Configured, signedGetUrl } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { hasUnlocked } from "@/lib/unlock";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  if (!isR2Configured()) {
    return new Response("R2 ayarlı değil", { status: 503 });
  }

  const { kod } = await params;
  const [post, session] = await Promise.all([getPost(kod), getSession()]);
  const admin = isAdminEmail(session?.user?.email);

  if (!post) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const owner = Boolean(session?.user?.id && session.user.id === post.userId);
  if (!isPubliclyVisible(post) && !admin && !owner) {
    return new Response("Bulunamadı", { status: 404 });
  }

  if (post.passwordHash && !admin) {
    const unlocked = await hasUnlocked(kod);
    if (!owner && !unlocked) {
      return new Response("Şifre gerekli", { status: 401 });
    }
  }

  if (!post.passwordHash && isPubliclyVisible(post)) {
    const url = await signedGetUrl(post.r2Key);
    return Response.redirect(url, 302);
  }

  const object = await getFromR2(post.r2Key);
  if (!object.stream) {
    return new Response("Dosya yok", { status: 404 });
  }

  return new Response(object.stream, {
    headers: {
      "Content-Type": post.mime,
      "Cache-Control": "private, max-age=604800, stale-while-revalidate=2592000",
    },
  });
}
