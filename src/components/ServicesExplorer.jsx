"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { pick, pickRequired } from "@/lib/localized";
import { Icon, categoryIcon } from "./Icon";
import { useBooking } from "./BookingProvider";
import { ServiceDetailsModal } from "./ServiceDetailsModal";

/** USD amounts stay in Latin digits in both languages — they read as currency. */
function formatUsd(value) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ServicesExplorer({ services, categories, concerns, doctors }) {
  // The two browsing modes are mutually exclusive: switching modes (or
  // jumping to a concern from a badge) resets the other mode's selection so
  // a category filter and a concern filter are never applied at once.
  const [mode, setMode] = useState("category");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeConcern, setActiveConcern] = useState("all");
  const [detailsServiceId, setDetailsServiceId] = useState(null);
  const locale = useLocale();
  const t = useTranslations("services");
  const { openBooking } = useBooking();

  function selectMode(nextMode) {
    setMode(nextMode);
    setActiveCategory("all");
    setActiveConcern("all");
  }

  function selectConcern(concernId) {
    setMode("concern");
    setActiveCategory("all");
    setActiveConcern(concernId);
  }

  const filtered = useMemo(() => {
    if (mode === "concern") {
      return activeConcern === "all"
        ? services
        : services.filter((s) =>
            s.concerns.some((c) => c.id === activeConcern),
          );
    }
    return activeCategory === "all"
      ? services
      : services.filter((s) => s.category.id === activeCategory);
  }, [services, mode, activeCategory, activeConcern]);

  const categoryTabs = [
    { id: "all", label: t("all") },
    ...categories.map((c) => ({
      id: c.id,
      label: pickRequired(c, "name", locale),
    })),
  ];

  const concernTabs = [
    { id: "all", label: t("allConcerns") },
    ...concerns.map((c) => ({
      id: c.id,
      label: pickRequired(c, "name", locale),
    })),
  ];

  const tabs = mode === "category" ? categoryTabs : concernTabs;
  const active = mode === "category" ? activeCategory : activeConcern;
  const setActive = mode === "category" ? setActiveCategory : setActiveConcern;

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
      <div
        role="group"
        aria-label={`${t("byCategory")} / ${t("byConcern")}`}
        className="inline-flex rounded-xl border border-border bg-surface-2 p-1"
      >
        <button
          type="button"
          onClick={() => selectMode("category")}
          aria-pressed={mode === "category"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "category"
              ? "bg-surface text-fg shadow-card"
              : "text-muted hover:text-fg"
          }`}
        >
          {t("byCategory")}
        </button>
        <button
          type="button"
          onClick={() => selectMode("concern")}
          aria-pressed={mode === "concern"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "concern"
              ? "bg-surface text-fg shadow-card"
              : "text-muted hover:text-fg"
          }`}
        >
          {t("byConcern")}
        </button>
      </div>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
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
              onClick={() => setDetailsServiceId(service.id)}
              className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover"
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
                    <li key={concern.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectConcern(concern.id);
                        }}
                        className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand"
                      >
                        {pickRequired(concern, "name", locale)}
                      </button>
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

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openBooking(service.id);
                }}
                className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
              >
                {t("bookCta")}
              </button>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      )}

      {detailsServiceId && (
        <ServiceDetailsModal
          serviceId={detailsServiceId}
          doctors={doctors}
          onClose={() => setDetailsServiceId(null)}
        />
      )}
    </div>
  );
}
