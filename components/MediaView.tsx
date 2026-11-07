import { publicMediaUrl } from "@/lib/r2";
import type { Post } from "@/db/schema";

export function MediaView({ post }: { post: Post }) {
  const src = publicMediaUrl(post.id, post.r2Key, Boolean(post.passwordHash));

  if (post.type === "video") {
    return (
      <video
        controls
        playsInline
        src={src}
        className="max-h-[70vh] w-full rounded-xl bg-black sm:max-h-[80vh]"
      />
    );
  }

  if (post.type === "audio") {
    return (
      <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
        <audio controls src={src} className="w-full" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={post.originalName ?? post.id}
      className="max-h-[70vh] w-full rounded-xl object-contain sm:max-h-[80vh]"
    />
  );
}
