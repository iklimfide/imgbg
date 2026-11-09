export function MediaPreview({
  type,
  src,
}: {
  type: "image" | "video" | "audio";
  src: string;
}) {
  if (type === "video") {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        src={src}
        className="mx-auto max-h-[70vh] w-full max-w-full rounded-2xl bg-black sm:max-h-[80vh]"
      />
    );
  }

  if (type === "audio") {
    return (
      <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
        <audio controls src={src} className="w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-fit max-w-full overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="block max-h-[70vh] max-w-full object-contain sm:max-h-[80vh]" />
    </div>
  );
}
