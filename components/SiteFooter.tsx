import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-6 py-10 text-center text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Hızlı ve güvenli
          </p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Medyan hazırsa, gerisi kolay.</h2>
          <p className="mt-2 text-sm text-white/85">Yükle, kısa link al, saniyeler içinde paylaş.</p>
          <Link
            href="/#yukle"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-violet-700"
          >
            Hemen yükle
          </Link>
        </div>
      </div>
    </footer>
  );
}
