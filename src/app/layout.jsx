import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SiteChrome } from "@/components/SiteChrome";
import { ThemeProvider } from "@/components/ThemeProvider";
import { localeDir } from "@/i18n/config";
import { cookies } from "next/headers";
import { defaultTheme, isTheme, THEME_COOKIE, themeAttribute } from "@/lib/theme";

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
    icons: {
      icon: "/logo-hd.png",
    },
  };
}

export default async function RootLayout({ children }) {
  // Resolved on the server from the locale cookie, so the very first paint is
  // already in the right language and direction.
  const locale = await getLocale();

  // Same idea for the colour scheme: reading the cookie here means <html>
  // carries the right `data-theme` in the very first response, so a visitor
  // who chose dark never sees a white flash before hydration.
  const cookieStore = await cookies();
  const stored = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(stored) ? stored : defaultTheme;

  return (
    <html
      lang={locale}
      dir={localeDir[locale] ?? "ltr"}
      data-theme={themeAttribute(theme)}
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <NextIntlClientProvider>
          <ThemeProvider theme={theme}>
            <SiteChrome nav={<Nav />} footer={<Footer />}>
              {children}
            </SiteChrome>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
