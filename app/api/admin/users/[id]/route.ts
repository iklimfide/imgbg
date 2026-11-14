import { requireAdmin } from "@/lib/admin";
import { deleteAdminUser, updateAdminUser } from "@/lib/users-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
  } | null;
  if (!body) {
    return Response.json({ error: "İstek geçersiz." }, { status: 400 });
  }
  try {
    const user = await updateAdminUser(id, body);
    return Response.json({ ok: true, user });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Kaydedilemedi.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteAdminUser(id, admin.id);
    return Response.json({ ok: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Silinemedi.";
    return Response.json({ error: message }, { status: 400 });
  }
}
