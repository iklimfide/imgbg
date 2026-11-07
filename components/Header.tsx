import Image from "next/image";
import Link from "next/link";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { SITE_NAME } from "@/lib/site";
import { HeaderMenu } from "@/components/HeaderMenu";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
        <HeaderMenu signedIn={Boolean(session?.user)} isAdmin={isAdminEmail(session?.user?.email)} />
      </div>
    </header>
  );
}
