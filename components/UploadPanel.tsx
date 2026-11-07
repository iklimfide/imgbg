"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AudioRecorder, type AudioRecorderHandle } from "@/components/AudioRecorder";
import { PasswordInput } from "@/components/PasswordInput";
import { ErrorModal } from "@/components/ErrorModal";
import { LinkAddModal } from "@/components/LinkAddModal";
import { ShareSuccessModal, type ShareResult } from "@/components/ShareSuccessModal";
import { UploadProgressModal } from "@/components/UploadProgressModal";
import { fileLimit, formatMb, ttlOptionsFor } from "@/lib/quota";
import type { MediaKind } from "@/lib/site";

const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac,audio/x-m4a,audio/flac,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm",
};

const MAX_FILES = 20;

type QueueItem = {
  id: string;
  file: File;
  preview: string;
};

type UploadJson = {
  kod?: string;
  error?: string;
  code?: string;
  status?: number;
  permanent?: boolean;
  ttlLabel?: string;
  protected?: boolean;
  deleteToken?: string;
};

function htmlHint(status: number, text: string) {
  const title = text.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  const fn = text.match(/\b(FUNCTION_[A-Z0-9_]+|EDGE_FUNCTION_[A-Z0-9_]+|NO_RESPONSE_FROM_FUNCTION)\b/)?.[1];
  const digest = text.match(/\bDIGEST:?\s*([a-z0-9]+)/i)?.[1];
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  return [`HTTP ${status}`, fn, digest, title || plain].filter(Boolean).join(" · ");
}

function failMessage(cause: unknown, step?: string) {
  const parts: string[] = [];
  if (step) {
    parts.push(step);
  }
  if (cause && typeof cause === "object") {
    const row = cause as UploadJson;
    if (typeof row.status === "number") {
      parts.push(`HTTP ${row.status}`);
    }
    if (typeof row.code === "string" && row.code !== step) {
      parts.push(row.code);
    }
    if (typeof row.error === "string" && row.error) {
      parts.push(row.error);
    }
  } else if (cause instanceof Error && cause.message) {
    parts.push(cause.message);
  }
  if (parts.length <= (step ? 1 : 0)) {
    parts.push("yüklenemedi");
  }
  return parts.join(" · ");
}

async function readJson<T extends UploadJson>(response: Response, step: string) {
  const text = await response.text();
  let payload: T;
  try {
    payload = JSON.parse(text) as T;
  } catch {
    throw { error: htmlHint(response.status, text), code: step, status: response.status };
  }
  if (!response.ok) {
    throw {
      error: payload.error || htmlHint(response.status, text),
      code: payload.code || step,
      status: payload.status || response.status,
    };
  }
  return payload;
}

function putWithXhr(
  url: string,
  file: File,
  contentType: string,
  onProgress: (loaded: number, total: number) => void,
  assignXhr: (xhr: XMLHttpRequest | null) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    assignXhr(xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    xhr.onload = () => {
      assignXhr(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      const hint = (xhr.responseText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 120);
      reject({ error: hint || "R2 yüklemesi başarısız.", code: "R2_PUT", status: xhr.status });
    };
    xhr.onerror = () => {
      assignXhr(null);
      reject({ error: "R2 bağlantısı reddedildi (CORS).", code: "R2_CORS", status: 0 });
    };
    xhr.onabort = () => {
      assignXhr(null);
      reject({ error: "abort" });
    };
    xhr.send(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadPanel({
  member,
  admin = false,
  initialKind = "image",
}: {
  member: boolean;
  admin?: boolean;
  initialKind?: MediaKind;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioRecorderHandle | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const actionRef = useRef<"pause" | "cancel" | null>(null);
  const resumeRef = useRef<(() => void) | null>(null);
  const [kind, setKind] = useState<MediaKind>(initialKind);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [ttl, setTtl] = useState(member && initialKind === "image" ? "forever" : "1d");
  const [protect, setProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ShareResult[]>([]);
  const [expiresNote, setExpiresNote] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [recording, setRecording] = useState(false);

  const isImage = kind === "image";
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function revokeAll(list: QueueItem[]) {
    list.forEach((item) => URL.revokeObjectURL(item.preview));
  }

  function openUploadPrompt() {
    if (pending) {
      return;
    }
    if (kind === "audio") {
      if (!recording) {
        void audioRef.current?.start();
      }
      return;
    }
    inputRef.current?.click();
  }

  function pickKind(next: MediaKind) {
    if (kind === next) {
      openUploadPrompt();
      return;
    }
    revokeAll(items);
    setKind(next);
    setItems([]);
    setLinkOpen(false);
    setRecording(false);
    setError("");
    if (next !== "image") {
      const allowed = ttlOptionsFor(next).map((option) => option.key);
      setTtl((current) => (allowed.includes(current as (typeof allowed)[number]) ? current : "1d"));
    }
  }

  function addFiles(list: FileList | File[]) {
    const limit = fileLimit(member, kind, admin);
    const incoming = Array.from(list).filter((file) => {
      const type = file.type;
      if (kind === "image") {
        return type.startsWith("image/");
      }
      if (kind === "video") {
        return type.startsWith("video/");
      }
      return type.startsWith("audio/") || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm)$/i.test(file.name);
    });
    if (Number.isFinite(limit) && incoming.some((file) => file.size > limit)) {
      setError(`Dosya boyutunuz çok büyük. İzin verilen ${formatMb(limit)}MB`);
      return;
    }
    setItems((current) => {
      if (kind === "video") {
        const file = incoming[0];
        if (!file) {
          return current;
        }
        revokeAll(current);
        return [
          {
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            file,
            preview: URL.createObjectURL(file),
          },
        ];
      }
      const room = MAX_FILES - current.length;
      const next = incoming.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        preview: URL.createObjectURL(file),
      }));
      return [...current, ...next];
    });
    setError("");
  }

  function removeQueued(id: string) {
    setItems((current) => {
      const found = current.find((item) => item.id === id);
      if (found) {
        URL.revokeObjectURL(found.preview);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function clearQueued() {
    revokeAll(items);
    setItems([]);
  }

  async function addFromUrl(url: string) {
    if (!isImage) {
      return "Bu sekmede bağlantı eklenmez.";
    }
    const next = url.trim();
    if (!next) {
      return "Bir bağlantı yapıştır.";
    }
    if (items.length >= MAX_FILES) {
      return `En fazla ${MAX_FILES} dosya ekleyebilirsin.`;
    }
    setFetchingUrl(true);
    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: next, kind }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        return json?.error ?? "Bağlantıdan dosya alınamadı.";
      }
      const blob = await response.blob();
      const rawName = response.headers.get("X-File-Name");
      const name = rawName ? decodeURIComponent(rawName) : "link";
      const file = new File([blob], name, { type: blob.type || "image/jpeg" });
      addFiles([file]);
      return null;
    } catch {
      return "Bağlantıdan dosya alınamadı.";
    } finally {
      setFetchingUrl(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (kind === "audio") {
      if (recording) {
        audioRef.current?.stop();
        return;
      }
      if (items.length === 0) {
        await audioRef.current?.start();
        return;
      }
    }
    if (items.length === 0) {
      openUploadPrompt();
      return;
    }
    if (protect && password.trim().length < 4) {
      setError("Şifre en az 4 karakter olmalı.");
      return;
    }
    setError("");
    setPending(true);
    setPaused(false);
    actionRef.current = null;
    const queue = [...items];
    const batch = queue.reduce((sum, item) => sum + item.file.size, 0);
    setBatchTotal(batch);
    setLoadedBytes(0);
    const uploaded: ShareResult[] = [];
    const failures: string[] = [];
    let note = "";
    let doneBytes = 0;

    let index = 0;
    while (index < queue.length) {
      if (actionRef.current === "cancel") {
        break;
      }
      if (actionRef.current === "pause") {
        await new Promise<void>((resolve) => {
          resumeRef.current = resolve;
        });
        actionRef.current = null;
        continue;
      }
      const item = queue[index];
      try {
        const prepared = await readJson<UploadJson & { putUrl?: string; mime?: string; kod?: string }>(
          await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              ttl,
              name: item.file.name,
              size: item.file.size,
              mime: item.file.type,
            }),
          }),
          "PREPARE",
        );

        if (!prepared.putUrl || !prepared.kod) {
          throw { error: prepared.error ?? "yüklenemedi" };
        }

        const mime = prepared.mime || item.file.type || "application/octet-stream";
        await putWithXhr(
          prepared.putUrl,
          item.file,
          mime,
          (loaded, total) => {
            const ratio = total > 0 ? loaded / total : 0;
            setLoadedBytes(doneBytes + item.file.size * ratio);
          },
          (xhr) => {
            xhrRef.current = xhr;
          },
        );

        const json = await readJson<UploadJson>(
          await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "complete",
              kod: prepared.kod,
              kind,
              ttl,
              password: protect ? password.trim() : "",
              name: item.file.name,
              mime,
            }),
          }),
          "COMPLETE",
        );

        if (!json.kod || !json.deleteToken) {
          failures.push(`${item.file.name}: ${json.error ?? "yüklenemedi"}`);
          index += 1;
          continue;
        }
        note = [
          json.permanent ? "Bu paylaşımlar kalıcı." : json.ttlLabel,
          json.protected ? "Şifre korumalı." : "",
        ]
          .filter(Boolean)
          .join(" ");
        uploaded.push({
          kod: json.kod,
          url: `${window.location.origin}/${json.kod}`,
          preview: item.preview,
          kind,
          name: item.file.name,
          deleteToken: json.deleteToken,
        });
        doneBytes += item.file.size;
        setLoadedBytes(doneBytes);
        index += 1;
      } catch (cause) {
        if (cause && typeof cause === "object" && "error" in cause && cause.error === "abort") {
          if (actionRef.current === "cancel") {
            break;
          }
          continue;
        }
        failures.push(`${item.file.name}: ${failMessage(cause)}`);
        index += 1;
      }
    }

    setPending(false);
    setPaused(false);
    setPassword("");
    setProtect(false);
    setItems([]);
    if (uploaded.length > 0) {
      setResults(uploaded);
      setExpiresNote(note);
      setModalOpen(true);
    } else if (actionRef.current === "cancel") {
      setError("");
    }
    if (failures.length > 0 && actionRef.current !== "cancel") {
      const sizeError = failures.find((item) => item.includes("çok büyük"));
      setError(
        sizeError
          ? `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(fileLimit(member, kind))}MB`
          : failures.join("\n"),
      );
    }
    actionRef.current = null;
  }

  return (
    <form
      id="yukle"
      onSubmit={onSubmit}
      className="@container overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
        {(
          [
            {
              key: "image" as const,
              label: "Resim yükle",
              on: "bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-none",
              off: "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/60",
            },
            {
              key: "video" as const,
              label: "Video yükle",
              on: "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-200 dark:shadow-none",
              off: "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/60",
            },
            {
              key: "audio" as const,
              label: "Ses kaydet",
              on: "bg-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none",
              off: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-900/60",
            },
          ]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => pickKind(tab.key)}
            className={`min-h-12 rounded-xl px-2 text-sm font-semibold sm:min-h-14 sm:text-base ${
              kind === tab.key ? tab.on : tab.off
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {kind !== "audio" ? (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple={kind === "image"}
              accept={ACCEPT[kind]}
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                }
                event.target.value = "";
              }}
            />

            {kind === "image" || items.length === 0 ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center ${
                items.length === 0 ? "min-h-52 py-10 sm:min-h-64" : "min-h-24 py-6"
              } ${
                dragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                  : "border-violet-200 bg-violet-50/70 dark:border-slate-700 dark:bg-slate-800/60"
              }`}
            >
              {items.length === 0 ? (
                <>
                  <svg viewBox="0 0 64 64" className="h-16 w-16 text-violet-500" fill="none">
                    <path
                      d="M20 38c-7 0-12-5-12-12 0-6 4-11 10-12 2-7 8-12 16-12 9 0 16 7 16 16h2c6 0 10 5 10 10s-4 10-10 10H20Z"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path d="M32 28v18M32 28l-7 7M32 28l7 7" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <p className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">
                    {kind === "image" ? "Resim yükle" : "Video yükle"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {kind === "image"
                      ? "birden fazla dosya seçebilirsin"
                      : admin
                        ? "tek video"
                        : `tek video, en fazla ${formatMb(fileLimit(member, "video"))} MB`}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">+ Daha fazla resim ekleyin</p>
              )}
            </div>
            ) : null}
          </>
        ) : (
          <AudioRecorder
            ref={audioRef}
            disabled={pending}
            onRecorded={(file) => addFiles([file])}
            onError={setError}
            onRecordingChange={setRecording}
          />
        )}

        {isImage ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setLinkOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-violet-200 px-4 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-600 dark:text-violet-300"
          >
            Linkten ekle
          </button>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearQueued}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700"
              >
                Seçimi temizle
              </button>
              <p className="text-sm text-slate-500">
                {items.length}/{MAX_FILES} · {formatSize(totalBytes)}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-violet-50/80 p-2 dark:bg-slate-800"
                >
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : kind === "video" ? (
                    <video src={item.preview} className="h-14 w-14 rounded-xl object-cover" muted />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-slate-900 dark:text-violet-300">
                      ♪
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(item.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Kuyruktan çıkar"
                    onClick={() => removeQueued(item.id)}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-white text-slate-500 hover:text-red-600 dark:bg-slate-900"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 @min-[36rem]:grid-cols-2">
          <label className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Saklama süresi</span>
            <select
              value={ttl}
              onChange={(event) => setTtl(event.target.value)}
              className="mt-3 w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {ttlOptionsFor(kind).map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
              {member && kind === "image" ? <option value="forever">Kalıcı (silinmesin)</option> : null}
            </select>
            {kind !== "image" ? (
              <p className="mt-2 text-xs text-slate-500">Video ve ses en fazla 24 saat sonra yayından kalkar.</p>
            ) : !member ? (
              <p className="mt-2 text-xs text-slate-500">
                Süreyi sen seçersin. Hiç silinmesin dersen{" "}
                <Link href="/kayit" className="text-violet-600">
                  üye ol
                </Link>
                .
              </p>
            ) : null}
          </label>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Şifre koruması</span>
              <button
                type="button"
                role="switch"
                aria-checked={protect}
                onClick={() => setProtect((value) => !value)}
                className={`relative h-7 w-12 rounded-full transition ${
                  protect ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
                    protect ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            {protect ? (
              <div className="mt-3">
                <PasswordInput
                  minLength={4}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Paylaşım şifresi"
                  className="w-full min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Açarsan linki açmak için şifre gerekir.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-base font-semibold text-white shadow-lg shadow-violet-200 hover:from-violet-500 hover:to-fuchsia-400 disabled:opacity-60 dark:shadow-none"
        >
          {pending
            ? "Yükleniyor..."
            : kind === "audio"
              ? recording
                ? "Kaydı durdur"
                : items.length === 0
                  ? "Ses kaydet"
                  : "Kaydı paylaş"
              : kind === "image"
                ? items.length > 1
                  ? "Resimleri yükle"
                  : "Resim yükle"
                : items.length > 1
                  ? "Videoları yükle"
                  : "Video yükle"}
        </button>
      </div>
      <UploadProgressModal
        open={pending}
        percent={batchTotal > 0 ? (loadedBytes / batchTotal) * 100 : 0}
        loaded={loadedBytes}
        total={batchTotal}
        paused={paused}
        onPause={() => {
          actionRef.current = "pause";
          setPaused(true);
          xhrRef.current?.abort();
        }}
        onResume={() => {
          setPaused(false);
          resumeRef.current?.();
          resumeRef.current = null;
        }}
        onCancel={() => {
          actionRef.current = "cancel";
          setPaused(false);
          resumeRef.current?.();
          resumeRef.current = null;
          xhrRef.current?.abort();
        }}
      />
      <LinkAddModal
        open={linkOpen}
        pending={fetchingUrl}
        onClose={() => setLinkOpen(false)}
        onAdd={addFromUrl}
      />
      <ErrorModal message={error} onClose={() => setError("")} />
      <ShareSuccessModal
        open={modalOpen}
        items={results}
        note={expiresNote}
        onDeleted={(kod) => {
          setResults((current) => {
            const found = current.find((item) => item.kod === kod);
            if (found) {
              URL.revokeObjectURL(found.preview);
            }
            return current.filter((item) => item.kod !== kod);
          });
        }}
        onClose={() => {
          setModalOpen(false);
          results.forEach((item) => URL.revokeObjectURL(item.preview));
          setResults([]);
        }}
      />
    </form>
  );
}
