"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";

export function UnlockForm({ kod }: { kod: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    const response = await fetch(`/api/posts/${kod}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Şifre kabul edilmedi.");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <h1 className="text-xl font-semibold">Şifreli paylaşım</h1>
      <p className="text-sm text-slate-500">Bu dosyayı görmek için şifre gerekli.</p>
      <PasswordInput
        required
        minLength={4}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full min-h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Şifre"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {pending ? "Kontrol..." : "Aç"}
      </button>
    </form>
  );
}
