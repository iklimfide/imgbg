import { MediaPreview } from "@/components/MediaPreview";
import { mediaSrc } from "@/lib/r2";
import type { Post } from "@/db/schema";

export async function MediaView({ post }: { post: Post }) {
  const src = await mediaSrc(post.id, post.r2Key, Boolean(post.passwordHash));
  return <MediaPreview type={post.type} src={src} />;
}
