"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isTheme, THEME_COOKIE } from "./theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Persists the chosen colour scheme, then re-renders the tree with it.
 *
 * A cookie rather than localStorage, matching how the locale is stored: the
 * server can read it while rendering, so <html> already carries the right
 * `data-theme` in the first response. Reading it in an effect after hydration
 * would repaint the whole site a moment after it appears.
 */
export async function setTheme(theme) {
  if (!isTheme(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
