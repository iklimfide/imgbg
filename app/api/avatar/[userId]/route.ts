import { getFromR2, isR2Configured } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!isR2Configured()) {
    return new Response("R2 ayarlı değil", { status: 503 });
  }
  const { userId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return new Response("Bulunamadı", { status: 404 });
  }
  try {
    const object = await getFromR2(`avatars/${userId}.webp`);
    if (!object.stream) {
      return new Response("Bulunamadı", { status: 404 });
    }
    return new Response(object.stream, {
      headers: {
        "Content-Type": object.contentType ?? "image/webp",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
