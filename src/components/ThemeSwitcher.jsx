"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { setTheme } from "@/lib/themeActions";
import { themes } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

const icons = {
  light: "sun",
  system: "monitor",
  dark: "moon",
};

/**
 * Light / follow-the-OS / dark, as a segmented group so it reads the same way
 * as the language switcher sitting beside it.
 *
 * The active segment comes from ThemeProvider rather than from the browser:
 * the choice lives in a cookie the root layout already reads, so the right
 * segment is highlighted in the first paint with no client-side flash.
 */
export function ThemeSwitcher({ className = "" }) {
  const active = useTheme();
  const t = useTranslations("nav");
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("theme")}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5 ${
        pending ? "opacity-60" : ""
      } ${className}`}
    >
      {themes.map((theme) => {
        const isActive = theme === active;
        return (
          <button
            key={theme}
            type="button"
            aria-pressed={isActive}
            aria-label={t(`theme_${theme}`)}
            title={t(`theme_${theme}`)}
            disabled={pending || isActive}
            onClick={() => startTransition(() => setTheme(theme))}
            className={`grid h-7 w-8 place-items-center rounded-md transition-colors ${
              isActive
                ? "bg-surface text-fg shadow-card"
                : "text-muted hover:text-fg"
            }`}
          >
            <Icon name={icons[theme]} size={15} />
          </button>
        );
      })}
    </div>
  );
}
