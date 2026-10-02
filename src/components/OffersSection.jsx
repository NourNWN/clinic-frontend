"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickRequired } from "@/lib/localized";
import { Icon } from "./Icon";
import { Photo } from "./Photo";
import { useBooking } from "./BookingProvider";

/** USD amounts stay in Latin digits in both languages — they read as currency. */
function formatUsd(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatOfferDate(isoDate, locale) {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * The offers running today, one card each. `/api/offers` has already applied
 * every rule about what may be advertised — the date window, withdrawn
 * brands, hidden treatments — so anything that arrives here is bookable and
 * is rendered as-is.
 *
 * Each discounted brand is a button rather than a label: the offer price is
 * the reason someone is reading this section, so the row that shows it is
 * also the row that starts the booking. BookingModal picks the offer up on
 * its own once the treatment is open, because the variant it loads carries
 * its own active_offer.
 */
export function OffersSection({ offers }) {
  const locale = useLocale();
  const t = useTranslations("offers");
  const tBooking = useTranslations("bookingForm");
  const { openBooking } = useBooking();

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-2">
      {offers.map((offer) => (
        <article
          key={offer.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-all duration-200 hover:border-border-strong hover:shadow-card-hover"
        >
          <Photo src={offer.photo_url} className="h-40 w-full object-cover" />

          <div className="flex flex-1 flex-col p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight text-fg">
                {pickRequired(offer, "title", locale)}
              </h3>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                <Icon name="clock" size={13} />
                {t("endsOn", { date: formatOfferDate(offer.end_date, locale) })}
              </span>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              {offer.items.map((item) => {
                const service = pickRequired(item.service, "name", locale);
                return (
                  <li key={item.offer_item_id}>
                    <button
                      type="button"
                      onClick={() => openBooking(item.service.id)}
                      aria-label={t("bookAria", { service })}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-start transition-colors hover:border-brand hover:bg-brand-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">
                          {service}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {pickRequired(item, "brand_name", locale)}
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                          <bdi>
                            {tBooking("offerPriceSyp", {
                              price: Number(
                                item.offer_price_syp,
                              ).toLocaleString("en-US"),
                            })}
                          </bdi>
                        </span>
                        <span className="text-[11px] text-faint">
                          <bdi>
                            {t("usualPrice", {
                              price: formatUsd(item.price_usd),
                            })}
                          </bdi>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
