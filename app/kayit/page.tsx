import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/session";

export default async function KayitPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Kayıt ol</h1>
      <AuthForm mode="kayit" />
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Hesabın var mı?{" "}
        <Link href="/giris" className="text-violet-600">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
