"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";

const labels = {
  en: "EN",
  ar: "ع",
};

export function LocaleSwitcher({ className = "" }) {
  const active = useLocale();
  const t = useTranslations("nav");
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5 ${
        pending ? "opacity-60" : ""
      } ${className}`}
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={isActive}
            disabled={pending || isActive}
            onClick={() => startTransition(() => setLocale(locale))}
            className={`min-w-9 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-surface text-fg shadow-card"
                : "text-muted hover:text-fg"
            }`}
          >
            {labels[locale]}
          </button>
        );
      })}
    </div>
  );
}
