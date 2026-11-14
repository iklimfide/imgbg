import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { AdminUsers } from "@/components/AdminUsers";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { listAdminUsers } from "@/lib/users-admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email) || !session?.user) {
    notFound();
  }
  const users = await listAdminUsers();
  return (
    <div>
      <AdminNav current="users" />
      <AdminUsers users={users} selfId={session.user.id} />
    </div>
  );
}
