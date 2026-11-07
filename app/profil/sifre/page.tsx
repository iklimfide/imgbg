import { redirect } from "next/navigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SifrePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/giris");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ProfileAvatar name={session.user.name} image={session.user.image} />
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Profil ayarları</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@{session.user.name}</p>
          <p className="mt-1 text-xs text-slate-400">Profil resmini değiştirmek için tıkla.</p>
        </div>
      </div>
      <ProfileSettings />
    </div>
  );
}
