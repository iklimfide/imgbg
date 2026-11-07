import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/session";

export default async function GirisPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Giriş</h1>
      <AuthForm mode="giris" />
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="text-violet-600">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
