import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ShareCodes } from "@/components/ShareCodes";
import { DeletePostButton } from "@/components/DeletePostButton";
import { MediaView } from "@/components/MediaView";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { publiclyVisible, usedStorage } from "@/lib/posts";
import { formatMb, MEMBER_STORAGE_MAX_BYTES } from "@/lib/quota";
import { getSession } from "@/lib/session";
import { asShareKind, getSiteUrl, shareUrl } from "@/lib/site";

export default async function ProfilPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/giris");
  }

  const items = await db
    .select()
    .from(posts)
    .where(and(eq(posts.userId, session.user.id), publiclyVisible))
    .orderBy(desc(posts.createdAt));

  const origin = getSiteUrl();
  const used = await usedStorage({ userId: session.user.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{session.user.name}</h1>
        <p className="break-all text-sm text-slate-500 sm:text-base dark:text-slate-400">
          {session.user.email}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Kalıcı alan: {formatMb(used)} / {formatMb(MEMBER_STORAGE_MAX_BYTES)} MB
        </p>
      </div>
      <ProfileSettings name={session.user.name} email={session.user.email} />

      {items.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Henüz yükleme yok.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {items.map((post) => (
            <li
              key={post.id}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <MediaView post={post} />
              <ShareCodes
                pageUrl={shareUrl(post.id, origin)}
                mediaUrl={`${origin}/api/media/${post.id}`}
                name={post.originalName ?? post.id}
                kind={asShareKind(post.type)}
              />
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>/{post.id}</span>
                <DeletePostButton kod={post.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
