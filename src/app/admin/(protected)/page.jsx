"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getSession } from "@/lib/adminAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Icon } from "@/components/Icon";

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tAdmin = useTranslations("admin");

  // This page only ever mounts client-side, after the (protected) layout's
  // own guard has confirmed a session exists — it's never part of the
  // server-rendered tree, so reading localStorage directly here (rather
  // than in an effect) can't cause a hydration mismatch.
  const [user] = useState(() => getSession()?.user ?? null);

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {user ? t("welcome", { name: user.full_name }) : tAdmin("loading")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("subtitle")}
        </p>

        <nav className="mt-8 flex flex-col gap-3">
          {[
            {
              href: "/admin/appointments",
              icon: "clock",
              title: t("appointmentsLink"),
              description: t("appointmentsLinkDescription"),
            },
            {
              href: "/admin/services",
              icon: "sparkles",
              title: t("servicesLink"),
              description: t("servicesLinkDescription"),
            },
            // Manager-only, mirroring the backend's @require_role("manager")
            // on PUT /api/admin/exchange-rate and every /api/admin/offers route.
            ...(user?.role === "manager"
              ? [
                  {
                    href: "/admin/offers",
                    icon: "sparkles",
                    title: t("offersLink"),
                    description: t("offersLinkDescription"),
                  },
                  {
                    href: "/admin/exchange-rate",
                    icon: "tag",
                    title: t("exchangeRateLink"),
                    description: t("exchangeRateLinkDescription"),
                  },
                ]
              : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card-hover"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={item.icon} size={20} />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-fg">
                    {item.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                </div>
              </div>
              <Icon
                name="arrow"
                size={18}
                className="shrink-0 text-faint rtl:rotate-180"
              />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
