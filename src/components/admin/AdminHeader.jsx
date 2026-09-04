"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/adminAuth";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Icon } from "@/components/Icon";

/** Shared chrome for every page under /admin/(protected) — brand mark
 * (optionally with a back link), theme and locale switchers, and logout. */
export function AdminHeader({ backHref }) {
  const tNav = useTranslations("nav");
  const tAdmin = useTranslations("admin");
  const tDash = useTranslations("admin.dashboard");

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-8">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label={tAdmin("back")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-fg transition-colors hover:bg-surface-2"
          >
            <Icon name="arrow" size={16} className="rotate-180 rtl:rotate-0" />
          </Link>
        )}
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image
            src="/logo-hd.png"
            alt={tNav("logoAlt")}
            width={4392}
            height={2040}
            priority
            className="h-9 w-auto shrink-0"
          />
          <span className="text-[15px] font-semibold tracking-tight text-fg">
            {tNav("brand")}
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeSwitcher />
        <LocaleSwitcher />
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          <Icon name="close" size={15} />
          {tDash("logout")}
        </button>
      </div>
    </header>
  );
}
