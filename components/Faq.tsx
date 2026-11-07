const ITEMS = [
  {
    q: "Dosyalarım ne kadar süre saklanır?",
    a: "Resimde 1 dakika, 5 dakika, 1 gün, 1 ay veya 1 sene seçebilirsin; kalıcı resim yalnızca üyelerde vardır. Video ve ses en fazla 24 saat sonra yayından kalkar.",
  },
  {
    q: "Üye olmak zorunda mıyım?",
    a: "Hayır. Üye olmadan da resim, video ve ses yükleyip kısa link alabilirsin. Üyelik kalıcı arşiv ve daha fazla alan içindir.",
  },
  {
    q: "Hangi dosyalar yüklenir?",
    a: "Resim: JPEG, PNG, WebP, GIF — yüklenince WebP’ye çevrilir. Video: MP4 ve WebM. Ses: tarayıcıdan mikrofonla kaydedilir, hazır ses dosyası yüklenmez.",
  },
  {
    q: "Yüklediğim dosyayı silebilir miyim?",
    a: "Üyeler profil sayfasından kendi yüklemelerini silebilir. Misafir yüklemeler süre dolunca kendiliğinden kalkar.",
  },
  {
    q: "Şifre koruması nasıl çalışır?",
    a: "Yüklerken şifre korumasını açabilirsin. Linki alan kişi dosyayı görmek için şifreyi yazmak zorunda kalır.",
  },
  {
    q: "Üye olunca ne değişir?",
    a: "Resimlerin kalıcı olabilir; resim 20 MB, ses 50 MB, video 50 MB’a çıkar, toplam alan 2 GB olur. Video ve ses yine en fazla 24 saat yayında kalır.",
  },
];

export function Faq() {
  return (
    <section id="sss" className="space-y-5">
      <h2 className="text-center text-2xl font-semibold text-slate-800 sm:text-3xl dark:text-white">
        Aklındaki sorular, net cevaplar.
      </h2>
      <ul className="space-y-3">
        {ITEMS.map((item, index) => (
          <li key={item.q}>
            <details className="group rounded-2xl bg-violet-50/80 px-4 py-3 open:bg-violet-50 dark:bg-slate-900 dark:open:bg-slate-800">
              <summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                <span className="mt-0.5 rounded-md bg-violet-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{item.q}</span>
                <span className="text-slate-400 group-open:hidden">+</span>
                <span className="hidden text-slate-400 group-open:inline">×</span>
              </summary>
              <p className="mt-2 pl-10 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {item.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
