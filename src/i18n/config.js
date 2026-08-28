export const locales = ["en", "ar"];

export const defaultLocale = "en";

/** Cookie next-intl reads on every request to decide which messages to load. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeDir = {
  en: "ltr",
  ar: "rtl",
};

export function isLocale(value) {
  return locales.includes(value);
}
