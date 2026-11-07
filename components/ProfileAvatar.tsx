"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorModal } from "@/components/ErrorModal";

export function ProfileAvatar({
  name,
  image,
  size = "lg",
  editable = true,
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "lg";
  editable?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(image ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const box = size === "lg" ? "h-24 w-24" : "h-10 w-10";
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";

  async function onFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) {
      return;
    }
    setPending(true);
    setError("");
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/avatar", { method: "POST", body: data });
      const json = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !json?.url) {
        setError(json?.error ?? "Resim yüklenemedi.");
        return;
      }
      setPreview(json.url);
      router.refresh();
    } catch {
      setError("Resim yüklenemedi.");
    } finally {
      setPending(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending || !editable}
        onClick={() => {
          if (editable) {
            inputRef.current?.click();
          }
        }}
        className={`relative shrink-0 overflow-hidden rounded-full bg-violet-100 text-violet-700 ${
          editable ? "ring-2 ring-white dark:ring-slate-900" : ""
        } dark:bg-violet-950 dark:text-violet-200 ${box} ${editable ? "" : "cursor-default"}`}
        aria-label={editable ? "Profil resmi seç" : name}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={size === "lg" ? "text-3xl font-semibold" : "text-sm font-semibold"}>{letter}</span>
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-[10px] font-medium text-white">
            ...
          </span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => void onFile(event.target.files)}
      />
      <ErrorModal message={error} onClose={() => setError("")} />
    </>
  );
}
