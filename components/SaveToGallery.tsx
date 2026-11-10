"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { ModalCloseButton } from "@/components/ModalCloseButton";

export function SaveToGallery({ kod, signedIn, owned }: { kod: string; signedIn: boolean; owned: boolean }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"kayit" | "giris">("kayit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ url: string; already: boolean } | null>(
    owned ? { url: `/${kod}`, already: true } : null,
  );

  async function save() {
    setError("");
    setPending(true);
    type SaveJson = { error?: string; message?: string; url?: string; already?: boolean };
    try {
      let response: Response | null = null;
      let json: SaveJson | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(`/api/posts/${kod}/save`, { method: "POST" });
        json = (await response.json().catch(() => null)) as SaveJson | null;
        if (response.status !== 401 || attempt === 2) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!response) {
        setError("Eklenemedi.");
        return;
      }
      if (response.status === 401) {
        setAuthOpen(true);
        return;
      }
      if (!response.ok || !json?.url) {
        setError(json?.error === "auth" ? json.message ?? "Üye olman gerekiyor." : json?.error ?? "Eklenemedi.");
        return;
      }
      setSaved({ url: json.url, already: Boolean(json.already) });
      setAuthOpen(false);
    } catch {
      setError("Eklenemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {saved ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {saved.already ? "Bu medya zaten galerinde. " : "Galerine eklendi. "}
          <Link href={saved.url} className="font-medium underline underline-offset-2">
            Yeni link
          </Link>
          {" · "}
          <Link href="/profil" className="font-medium underline underline-offset-2">
            Galerim
          </Link>
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!signedIn) {
              setAuthOpen(true);
              return;
            }
            void save();
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {pending ? "Ekleniyor..." : "Galerime ekle"}
        </button>
      )}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {authOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setAuthOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-auth-title"
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 pr-16 shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalCloseButton onClick={() => setAuthOpen(false)} />
            <p id="save-auth-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {authMode === "kayit" ? "Galerine eklemek için üye ol" : "Giriş yap, galerine ekle"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Üye olunca bu medya senin galerine, yeni bir linkle kaydedilir.
            </p>
            <div className="mt-4">
              <AuthForm
                mode={authMode}
                onSuccess={async () => {
                  await save();
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "kayit" ? "giris" : "kayit")}
              className="mt-3 w-full text-center text-sm text-violet-600 hover:underline"
            >
              {authMode === "kayit" ? "Hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
            </button>
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              className="mt-2 w-full text-center text-sm text-slate-500"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
