"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { pick, pickRequired } from "@/lib/localized";
import { Icon, categoryIcon } from "./Icon";

/** USD amounts stay in Latin digits in both languages — they read as currency. */
function formatUsd(value) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ServicesExplorer({ services, categories }) {
  const [active, setActive] = useState("all");
  const locale = useLocale();
  const t = useTranslations("services");

  const filtered = useMemo(
    () =>
      active === "all"
        ? services
        : services.filter((s) => s.category.id === active),
    [services, active],
  );

  const tabs = [
    { id: "all", label: t("all") },
    ...categories.map((c) => ({
      id: c.id,
      label: pickRequired(c, "name", locale),
    })),
  ];

  function priceLabel(service) {
    const { min_price_usd, max_price_usd, count } = service.variants_preview;
    const min = formatUsd(min_price_usd);
    const max = formatUsd(max_price_usd);

    if (!min) {
      return { value: t("onRequest"), note: t("askReception") };
    }
    if (count > 1 && max && max !== min) {
      return { value: `${min} – ${max}`, note: t("options", { count }) };
    }
    return { value: min, note: t("options", { count }) };
  }

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={String(tab.id)}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-brand bg-brand text-brand-fg shadow-card"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => {
          const price = priceLabel(service);
          const description = pick(service, "description", locale);
          return (
            <article
              key={service.id}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-brand">
                <Icon
                  name={categoryIcon(service.category.name_en)}
                  size={15}
                  className="shrink-0"
                />
                {pickRequired(service.category, "name", locale)}
              </div>

              <h3 className="mt-3 text-base font-semibold tracking-tight text-fg">
                {pickRequired(service, "name", locale)}
              </h3>

              {description && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              )}

              {service.concerns.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {service.concerns.map((concern) => (
                    <li
                      key={concern.id}
                      className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted"
                    >
                      {pickRequired(concern, "name", locale)}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-fg">
                    <bdi>{price.value}</bdi>
                  </div>
                  <div className="text-[11px] text-faint">{price.note}</div>
                </div>
                {service.duration_estimate && (
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    <Icon name="clock" size={14} />
                    {t("minutes", { count: service.duration_estimate })}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
