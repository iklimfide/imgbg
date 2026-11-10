import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { HeaderBrand } from "@/components/HeaderBrand";
import { HeaderMenu } from "@/components/HeaderMenu";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
