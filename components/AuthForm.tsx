"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";
import { authErrorTr } from "@/lib/auth-messages";
import { isValidUsername, loginToEmail, normalizeUsername } from "@/lib/username";

type Mode = "giris" | "kayit";

const fieldClass =
  "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900";

export function AuthForm({
  mode,
  onSuccess,
}: {
  mode: Mode;
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const raw = username.trim();
    const isEmailLogin = mode === "giris" && raw.includes("@");
    const name = isEmailLogin ? raw.toLowerCase() : normalizeUsername(raw);
    if (!isEmailLogin && !isValidUsername(name)) {
      setError("Kullanıcı adı 2–24 karakter olmalı; harf, rakam, nokta, _ veya -.");
      return;
    }
    if (mode === "kayit" && password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setPending(true);
    const email = isEmailLogin ? name : loginToEmail(name);
    try {
      const result =
        mode === "kayit"
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setPending(false);
        setError(authErrorTr(result.error, mode));
        return;
      }
      if (onSuccess) {
        await onSuccess();
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (cause) {
      setError(authErrorTr(cause, mode));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-4">
      <label className="block space-y-1 text-sm">
        <span>{mode === "giris" ? "E-posta veya kullanıcı adı" : "Kullanıcı adı"}</span>
        <input
          required
          minLength={2}
          maxLength={mode === "giris" ? 254 : 24}
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
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
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
          visible={showPasswords}
          onToggleVisible={() => setShowPasswords((value) => !value)}
        />
      </label>
      {mode === "kayit" ? (
        <label className="block space-y-1 text-sm">
          <span>Şifre tekrar</span>
          <PasswordInput
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={fieldClass}
            visible={showPasswords}
            onToggleVisible={() => setShowPasswords((value) => !value)}
          />
        </label>
      ) : null}
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
