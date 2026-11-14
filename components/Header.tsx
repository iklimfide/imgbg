import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { HeaderBrand } from "@/components/HeaderBrand";
import { HeaderMenu } from "@/components/HeaderMenu";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f3f5fb] dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <HeaderBrand />
        <HeaderMenu
          signedIn={Boolean(session?.user)}
          isAdmin={isAdminEmail(session?.user?.email)}
          username={session?.user?.name ?? ""}
        />
      </div>
    </header>
  );
}
