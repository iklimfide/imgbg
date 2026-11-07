"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";

type Mode = "giris" | "kayit";

const fieldClass =
  "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    const result =
      mode === "kayit"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "İşlem başarısız.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-4">
      {mode === "kayit" ? (
        <label className="block space-y-1 text-sm">
          <span>Kullanıcı adı</span>
          <input
            required
            minLength={2}
            autoComplete="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </label>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span>E-posta</span>
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Şifre</span>
        <PasswordInput
          required
          minLength={8}
          autoComplete={mode === "kayit" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-violet-600 font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {pending ? "Bekle..." : mode === "kayit" ? "Hesap oluştur" : "Giriş yap"}
      </button>
    </form>
  );
}
