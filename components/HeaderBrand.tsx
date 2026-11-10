"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/site";

export function HeaderBrand() {
  const pathname = usePathname();
  const router = useRouter();
  const home = pathname === "/";

  if (home) {
    return (
      <Link href="/" className="flex min-w-0 items-center gap-2">
        <Image
          src="/logo.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-lg"
          priority
        />
        <span className="truncate text-base font-semibold text-slate-800 dark:text-white">{SITE_NAME}</span>
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Geri"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-full px-2 text-base font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
      >
        Anasayfa
      </Link>
    </div>
  );
}
