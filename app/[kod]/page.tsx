import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MediaView } from "@/components/MediaView";
import { SharePromo } from "@/components/SharePromo";
import { UnlockForm } from "@/components/UnlockForm";
import { isAdminEmail } from "@/lib/admin";
import { getLivePost, getPost, incrementViews, isExpired } from "@/lib/posts";
import { publicMediaUrl } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { SITE_NAME, getSiteUrl, shareUrl } from "@/lib/site";
import { hasUnlocked } from "@/lib/unlock";

function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kod: string }>;
}): Promise<Metadata> {
  const { kod } = await params;
  const site = getSiteUrl();
  const logo = `${site}/logo.png`;
  const page = shareUrl(kod, site);

  if (!/^[a-z0-9]{8}$/.test(kod)) {
    return { title: SITE_NAME };
  }

  const post = await getLivePost(kod);
  if (!post) {
    return { title: SITE_NAME, openGraph: { url: page, images: [{ url: logo }] } };
  }

  if (post.passwordHash) {
    const title = `${SITE_NAME} · Şifreli paylaşım`;
    const description = "Bu içerik şifre ile korunuyor.";
    return {
      title,
      description,
      openGraph: { title, description, url: page, siteName: SITE_NAME, type: "website", images: [{ url: logo }] },
      twitter: { card: "summary", title, description, images: [logo] },
    };
  }

  const kindLabel = post.type === "video" ? "Video" : post.type === "audio" ? "Ses kaydı" : "Resim";
  const title = `${kindLabel} · ${SITE_NAME}`;
  const description = `${SITE_NAME} üzerinde paylaşıldı.`;
  const file = absoluteUrl(publicMediaUrl(post.id, post.r2Key, false));
  const image = post.type === "image" ? file : logo;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: page,
      siteName: SITE_NAME,
      type: post.type === "video" ? "video.other" : "website",
      images: [{ url: image }],
      ...(post.type === "video" ? { videos: [{ url: file, type: post.mime }] } : {}),
    },
    twitter: {
      card: post.type === "image" ? "summary_large_image" : "summary",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PaylasimPage({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;
  if (!/^[a-z0-9]{8}$/.test(kod)) {
    notFound();
  }

  const [session, live] = await Promise.all([getSession(), getLivePost(kod)]);
  const admin = isAdminEmail(session?.user?.email);
  let post = live;
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
    void incrementViews(kod);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
      <MediaView post={post} />
      <SharePromo />
      {adminOnly ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Bu paylaşım kullanıcılara kapalı
          {post.deletedAt ? " · silindi" : ""}
          {post.hiddenAt ? " · gizli" : ""}
          {isExpired(post) ? " · süresi doldu" : ""}. Yalnızca sende görünür.
        </p>
      ) : null}
    </div>
  );
}
