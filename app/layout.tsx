import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Header } from "@/components/Header";
import { MobilePreview } from "@/components/MobilePreview";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeScript } from "@/components/ThemeScript";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const sans = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_NAME,
  applicationName: SITE_NAME,
  description: "Resim, video ve ses yükle, kısa linkle paylaş.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${sans.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[#f3f5fb] font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeScript />
        <Header />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <SiteFooter />
        <MobilePreview />
      </body>
    </html>
  );
}
