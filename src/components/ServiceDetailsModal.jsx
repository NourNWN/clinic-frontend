"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getServiceDetail } from "@/lib/api";
import { pick, pickRequired } from "@/lib/localized";
import { Icon, categoryIcon } from "./Icon";
import { Photo } from "./Photo";
import { useBooking } from "./BookingProvider";

/** USD amounts stay in Latin digits in both languages — they read as currency. */
function formatUsd(value) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatUsdAmount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatOfferDate(isoDate, locale) {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Full-detail view for a single service, opened from a card in
 * ServicesExplorer. Fetches `/api/services/:id` (the same call BookingModal
 * makes) so it always reflects live variants/offers/doctors rather than the
 * summary preview shown on the card.
 */
export function ServiceDetailsModal({ serviceId, doctors, onClose }) {
  const locale = useLocale();
  const t = useTranslations("serviceDetails");
  const tServices = useTranslations("services");
  const tBooking = useTranslations("bookingForm");
  const { openBooking } = useBooking();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Mounted fresh each time a card is opened (never re-scoped to a
  // different service in place), so the initial state above already covers
  // "loading, no data yet" — this effect only needs to fetch once.
  useEffect(() => {
    let cancelled = false;
    getServiceDetail(serviceId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  function handleBookNow() {
    onClose();
    openBooking(serviceId);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-details-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {detail && (
              <div className="flex items-center gap-2 text-xs font-medium text-brand">
                <Icon
                  name={categoryIcon(detail.category.name_en)}
                  size={15}
                  className="shrink-0"
                />
                {pickRequired(detail.category, "name", locale)}
              </div>
            )}
            <h2
              id="service-details-title"
              className="mt-1.5 text-xl font-semibold tracking-tight text-fg"
            >
              {detail ? pickRequired(detail, "name", locale) : " "}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-muted">{t("loading")}</p>
        )}
        {loadError && (
          <p className="mt-6 text-sm text-accent">{t("loadError")}</p>
        )}

        {detail && !loading && (
          <>
            <Photo
              src={detail.photo_url}
              className="mt-5 h-44 w-full rounded-xl object-cover sm:h-56"
            />

            {pick(detail, "description", locale) && (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {pick(detail, "description", locale)}
              </p>
            )}

            {detail.duration_estimate != null && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <Icon name="clock" size={14} />
                {tServices("minutes", { count: detail.duration_estimate })}
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-fg">
                {t("variantsTitle")}
              </h3>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {detail.variants.map((v) => (
                  <div
                    key={v.id}
                    className="overflow-hidden rounded-xl border border-border bg-surface-2"
                  >
                    {/* An offer banner sits above the brand it discounts,
                        so it reads as belonging to that row. */}
                    <Photo
                      src={v.active_offer?.photo_url}
                      className="h-24 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <Photo
                          src={v.photo_url}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <span className="font-medium text-fg">
                          {pickRequired(v, "brand_name", locale)}
                        </span>
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        {v.active_offer ? (
                          <>
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-faint line-through">
                                {formatUsd(v.price_usd)}
                              </span>
                              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                                <bdi>
                                  {tBooking("offerPriceSyp", {
                                    price: Number(
                                      v.active_offer.offer_price_syp,
                                    ).toLocaleString("en-US"),
                                  })}
                                </bdi>
                              </span>
                            </span>
                            <span className="text-[11px] text-muted">
                              {t("offerValidUntil", {
                                date: formatOfferDate(
                                  v.active_offer.end_date,
                                  locale,
                                ),
                              })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-fg">
                              <bdi>
                                {t("priceUsd", {
                                  price: formatUsdAmount(v.price_usd),
                                })}
                              </bdi>
                            </span>
                            <span className="text-[11px] text-muted">
                              {t("syNote")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-fg">
                {t("doctorsTitle")}
              </h3>
              {detail.doctors.length === 0 ? (
                <p className="mt-2.5 text-sm text-muted">{t("noDoctors")}</p>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {detail.doctors.map((d) => {
                    const full = doctors?.find((x) => x.id === d.id);
                    const specialty = full
                      ? pick(full, "specialty", locale)
                      : null;
                    return (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-fg"
                      >
                        <Icon name="user" size={13} className="text-brand" />
                        {pickRequired(d, "name", locale)}
                        {specialty && (
                          <span className="text-xs text-muted">
                            · {specialty}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleBookNow}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
            >
              {tServices("bookCta")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
