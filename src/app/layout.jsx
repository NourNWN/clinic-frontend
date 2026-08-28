import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { localeDir } from "@/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Arabic copy renders throughout the site, so it gets a face designed for it
// rather than falling back to whatever the OS picks.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return {
    title: `${t("brand")} — ${t("tagline")}`,
    description: t("tagline"),
  };
}

export default async function RootLayout({ children }) {
  // Resolved on the server from the locale cookie, so the very first paint is
  // already in the right language and direction.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={localeDir[locale] ?? "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <NextIntlClientProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
