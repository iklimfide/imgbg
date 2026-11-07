"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900";

export function ProfileSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (!currentPassword) {
      setError("Mevcut şifreyi yaz.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword: password,
        revokeOtherSessions: false,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Şifre güncellenemedi.");
      }
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setMessage("Şifre değiştirildi.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <p className="text-base font-semibold text-slate-800 dark:text-white">Şifre değiştir</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span>Mevcut şifre</span>
          <PasswordInput
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={fieldClass}
            visible={showPasswords}
            onToggleVisible={() => setShowPasswords((value) => !value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Yeni şifre</span>
          <PasswordInput
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
            visible={showPasswords}
            onToggleVisible={() => setShowPasswords((value) => !value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Yeni şifre (tekrar)</span>
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
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
