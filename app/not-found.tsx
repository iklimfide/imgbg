import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold sm:text-3xl">Bulunamadı</h1>
      <p className="text-slate-500 dark:text-slate-400">Bu kısa kodla bir paylaşım yok.</p>
      <Link href="/" className="inline-flex min-h-11 items-center text-violet-600">
        Ana sayfa
      </Link>
    </div>
  );
}
