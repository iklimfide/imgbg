import { getLivePost } from "@/lib/posts";
import { verifySharePassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { cookieName, makeUnlockToken } from "@/lib/unlock";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  if (!rateLimit(`unlock:${kod}:${request.headers.get("x-forwarded-for") ?? "ip"}`, 8, 10 * 60 * 1000)) {
    return Response.json({ error: "Çok fazla deneme." }, { status: 429 });
  }

  const post = await getLivePost(kod);
  if (!post?.passwordHash) {
    return Response.json({ error: "Bu paylaşım şifreli değil." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";
  if (!verifySharePassword(password, post.passwordHash)) {
    return Response.json({ error: "Şifre yanlış." }, { status: 401 });
  }

  const token = makeUnlockToken(kod);
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${cookieName(kod)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${12 * 60 * 60}`,
  );
  return response;
}
