"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useBooking } from "./BookingProvider";

// Listed in the order the sections appear down the page.
const links = [
  { href: "#categories", key: "categories" },
  { href: "#services", key: "services" },
  { href: "#offers", key: "offers", needsOffers: true },
  { href: "#doctors", key: "team" },
];

/**
 * `hasOffers` comes from the layout, which asks the API what is running
 * today. The offers section only exists on days it has something to show, so
 * the link has to come and go with it rather than scroll to nothing.
 */
export function Nav({ hasOffers = false }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const { openBooking } = useBooking();

  const navLinks = links.filter((link) => hasOffers || !link.needsOffers);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <Image
            src="/logo-hd.png"
            alt={t("logoAlt")}
            width={4392}
            height={2040}
            priority
            className="h-10 w-auto shrink-0"
          />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-fg">
              {t("brand")}
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-muted">
              {t("tagline")}
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {t(link.key)}
            </a>
          ))}
          <ThemeSwitcher className="ms-2" />
          <LocaleSwitcher className="ms-1" />
          <button
            type="button"
            onClick={() => openBooking()}
            className="ms-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
          >
            {t("book")}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border text-fg transition-colors hover:bg-surface-2"
          >
            <Icon name={open ? "close" : "menu"} size={18} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-surface px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {t(link.key)}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openBooking();
              }}
              className="mt-1 rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-brand-fg"
            >
              {t("book")}
            </button>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-muted">{t("theme")}</span>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
