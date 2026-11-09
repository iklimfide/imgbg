import Link from "next/link";

export function SharePromo() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-5 py-6 text-center text-white sm:px-8 sm:py-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Hızlı ve güvenli</p>
      <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
        Resim, Video, Ses kaydı. Üçü bir arada.
      </h2>
      <p className="mt-2 text-sm text-white/85">Yükle, kısa link al, saniyeler içinde paylaş.</p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
      >
        Hemen yükle ve paylaş
      </Link>
    </div>
  );
}
