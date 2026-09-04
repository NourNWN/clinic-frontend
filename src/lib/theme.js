/**
 * Colour-scheme preference.
 *
 * Three states, not two: "system" is a real choice, not the absence of one —
 * it means "keep following the OS", which is what the site did before this
 * switch existed and what most visitors will want to keep doing.
 *
 * Only an explicit "light" or "dark" is written to <html data-theme>; "system"
 * deliberately renders no attribute, leaving the `prefers-color-scheme` rule in
 * globals.css in charge.
 */
export const themes = ["light", "system", "dark"];

export const defaultTheme = "system";

/** Cookie the root layout reads to render the right theme on the first paint. */
export const THEME_COOKIE = "theme";

export function isTheme(value) {
  return themes.includes(value);
}

/** The value for <html data-theme>, or null when the OS should decide. */
export function themeAttribute(theme) {
  return theme === "light" || theme === "dark" ? theme : null;
}
