import { notFound } from "next/navigation";
import { ShareCodes } from "@/components/ShareCodes";
import { MediaView } from "@/components/MediaView";
import { SharePromo } from "@/components/SharePromo";
import { UnlockForm } from "@/components/UnlockForm";
import { isAdminEmail } from "@/lib/admin";
import { getLivePost, getPost, incrementViews, isExpired } from "@/lib/posts";
import { getSession } from "@/lib/session";
import { asShareKind, getSiteUrl, shareUrl } from "@/lib/site";
import { hasUnlocked } from "@/lib/unlock";

export default async function PaylasimPage({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;
  if (!/^[a-z0-9]{8}$/.test(kod)) {
    notFound();
  }

  const session = await getSession();
  const admin = isAdminEmail(session?.user?.email);
  let post = await getLivePost(kod);
  let adminOnly = false;
  if (!post && admin) {
    post = await getPost(kod);
    adminOnly = Boolean(post);
  }
  if (!post) {
    notFound();
  }

  const isOwner = Boolean(session?.user?.id && session.user.id === post.userId);
  const unlocked = admin || (post.passwordHash ? isOwner || (await hasUnlocked(kod)) : true);

  if (!unlocked) {
    return <UnlockForm kod={kod} />;
  }

  if (!adminOnly && !isOwner) {
    await incrementViews(kod);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
      <SharePromo />
      <MediaView post={post} />
      {adminOnly ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Bu paylaşım kullanıcılara kapalı
          {post.deletedAt ? " · silindi" : ""}
          {post.hiddenAt ? " · gizli" : ""}
          {isExpired(post) ? " · süresi doldu" : ""}. Yalnızca sende görünür.
        </p>
      ) : null}
      <ShareCodes
        pageUrl={shareUrl(kod, getSiteUrl())}
        mediaUrl={`${getSiteUrl()}/api/media/${kod}`}
        name={kod}
        kind={asShareKind(post.type)}
      />
    </div>
  );
}
