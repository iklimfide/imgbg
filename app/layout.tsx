import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Outfit } from "next/font/google";
import { Header } from "@/components/Header";
import { MediaCacheWorker } from "@/components/MediaCacheWorker";
import { MobilePreview } from "@/components/MobilePreview";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const sans = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SITE_NAME,
  applicationName: SITE_NAME,
  description: "Resim, video ve ses yükle, kısa linkle paylaş.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const dark = theme === "dark";
  return (
    <html lang="tr" className={`${sans.variable} h-full${dark ? " dark" : ""}`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[#f3f5fb] font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <MediaCacheWorker />
        <Header />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        {process.env.NODE_ENV === "development" ? <MobilePreview /> : null}
      </body>
    </html>
  );
}
