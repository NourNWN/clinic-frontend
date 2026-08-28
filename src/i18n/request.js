import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Locale comes from a cookie rather than a URL segment, so the site keeps a
 * single set of routes and the choice survives reloads. Resolving it here (on
 * the server) means the first paint is already in the right language — there
 * is no flash of English before Arabic loads.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
