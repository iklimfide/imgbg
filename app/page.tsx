import { Faq } from "@/components/Faq";
import { UploadPanel } from "@/components/UploadPanel";
import { getSession } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const session = await getSession();
  const { tur } = await searchParams;

  return (
    <div className="space-y-10 pb-4">
      <UploadPanel
        member={Boolean(session?.user)}
        initialKind={tur === "video" ? "video" : tur === "ses" || tur === "audio" ? "audio" : "image"}
      />
      <Faq />
    </div>
  );
}
