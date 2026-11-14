"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function HeaderMenu({
  signedIn,
  isAdmin,
  username,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  username?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {signedIn && username ? (
        <span className="max-w-[9rem] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:max-w-[14rem]">
          {username}
        </span>
      ) : null}
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Menü"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
        {open ? (
          <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <Link
              href="/#sss"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              SSS
            </Link>
            <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-sm text-slate-700 dark:text-slate-200">
              <span>Tema</span>
              <ThemeToggle />
            </div>
            {signedIn ? (
              <>
                {isAdmin ? (
                  <>
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Yönetim
                    </Link>
                    <Link
                      href="/admin/kullanicilar"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Kullanıcılar
                    </Link>
                  </>
                ) : null}
                <Link
                  href="/profil"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Galerim
                </Link>
                <Link
                  href="/profil/sifre"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Profil ayarları
                </Link>
                <div className="px-1">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Giriş yap
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
