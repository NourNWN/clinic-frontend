"use client";

import { createContext, useContext } from "react";
import { defaultTheme } from "@/lib/theme";

const ThemeContext = createContext(defaultTheme);

/**
 * Carries the colour scheme the server rendered with down to whichever
 * switcher is on screen.
 *
 * The value is resolved from the cookie in the root layout, not read from the
 * browser here: the public nav and the admin header sit in different subtrees,
 * and a client-side read would have to happen in an effect, briefly
 * highlighting the wrong segment on first paint.
 */
export function ThemeProvider({ theme, children }) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
