"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, createAppointment, getServiceDetail, getServices } from "@/lib/api";
import { pickRequired } from "@/lib/localized";
import { countryDisplayName, isValidPhoneNumber, toE164 } from "@/lib/phone";
import { CountrySelect } from "./CountrySelect";
import { Icon } from "./Icon";

/** USD amounts stay in Latin digits in both languages — they read as currency. */
function formatUsd(value) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function todayIsoDate() {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localMidnight.toISOString().slice(0, 10);
}

const DEFAULT_COUNTRY = "SY";

export function BookingModal({ serviceId, onClose }) {
  const locale = useLocale();
  const t = useTranslations("bookingForm");

  const isPreselected = serviceId != null;
  const today = useMemo(() => todayIsoDate(), []);

  const [allServices, setAllServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(serviceId ?? "");
  const [serviceDetail, setServiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [variantId, setVariantId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [day, setDay] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null); // { unavailable } | { message }
  const [result, setResult] = useState(null);

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

  // Only needed when opened with no pre-selected service.
  useEffect(() => {
    if (isPreselected) return;
    getServices()
      .then(setAllServices)
      .catch(() => {});
  }, [isPreselected]);

  // Full detail (variants + doctors) is only on the single-service endpoint.
  useEffect(() => {
    if (!selectedServiceId) {
      setServiceDetail(null);
      return;
    }
    let cancelled = false;
    setServiceDetail(null);
    setVariantId("");
    setDoctorId("");
    setLoadingDetail(true);
    setLoadError(false);
    getServiceDetail(selectedServiceId)
      .then((data) => {
        if (!cancelled) setServiceDetail(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceId]);

  const selectedVariant =
    serviceDetail?.variants.find((v) => v.id === Number(variantId)) ?? null;

  function phoneErrorMessage() {
    return t("validation.phone", { country: countryDisplayName(country, locale) });
  }

  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = t("validation.name");
    if (!phone.trim() || !isValidPhoneNumber(phone.trim(), country)) {
      errors.phone = phoneErrorMessage();
    }
    if (!variantId) errors.variant = t("validation.variant");
    if (!doctorId) errors.doctor = t("validation.doctor");
    if (!day || day < today) errors.day = t("validation.day");
    return errors;
  }

  function handlePhoneChange(e) {
    setPhone(e.target.value.replace(/[^\d\s\-()]/g, ""));
  }

  function handlePhoneBlur() {
    if (!phone.trim()) return;
    setFieldErrors((f) => {
      if (isValidPhoneNumber(phone.trim(), country)) {
        if (!f.phone) return f;
        const { phone: _drop, ...rest } = f;
        return rest;
      }
      return { ...f, phone: phoneErrorMessage() };
    });
  }

  function handleCountryChange(code) {
    setCountry(code);
    setFieldErrors((f) => {
      if (!f.phone) return f;
      const { phone: _drop, ...rest } = f;
      return rest;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      patient_name: name.trim(),
      patient_phone: toE164(phone.trim(), country),
      service_variant_id: Number(variantId),
      doctor_id: Number(doctorId),
      preferred_day: day,
    };
    if (selectedVariant?.active_offer) {
      payload.offer_item_id = selectedVariant.active_offer.offer_item_id;
    }

    setSubmitting(true);
    try {
      const res = await createAppointment(payload);
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.code === "no_exchange_rate") {
        setFormError({ unavailable: true });
      } else if (err instanceof ApiError && err.code === "invalid_doctor") {
        setFieldErrors((f) => ({ ...f, doctor: pickRequired(err, "message", locale) }));
      } else if (
        err instanceof ApiError &&
        (err.code === "invalid_variant" || err.code === "invalid_offer")
      ) {
        setFieldErrors((f) => ({ ...f, variant: pickRequired(err, "message", locale) }));
      } else if (err instanceof ApiError && err.code) {
        setFormError({ message: pickRequired(err, "message", locale) });
      } else {
        setFormError({ message: t("genericError") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="booking-modal-title"
            className="text-xl font-semibold tracking-tight text-fg"
          >
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {result ? (
          <div className="mt-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name="check" size={22} />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-fg">
              {pickRequired(result, "message", locale)}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
            >
              {t("successClose")}
            </button>
          </div>
        ) : formError?.unavailable ? (
          <div className="mt-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name="shield" size={22} />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t("unavailable")}
            </p>
            <a
              href="tel:+963112345678"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
            >
              <Icon name="phone" size={16} />
              <bdi>+963 11 234 5678</bdi>
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
            {formError?.message && (
              <p className="rounded-lg border border-border bg-accent-soft px-3 py-2 text-sm text-accent">
                {formError.message}
              </p>
            )}

            {!isPreselected && (
              <div>
                <label
                  htmlFor="booking-service"
                  className="text-sm font-medium text-fg"
                >
                  {t("serviceLabel")}
                </label>
                <select
                  id="booking-service"
                  value={selectedServiceId}
                  onChange={(e) =>
                    setSelectedServiceId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
                >
                  <option value="">{t("selectService")}</option>
                  {allServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {pickRequired(s, "name", locale)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isPreselected && serviceDetail && (
              <div>
                <span className="text-sm font-medium text-fg">
                  {t("serviceLabel")}
                </span>
                <p className="mt-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg">
                  {pickRequired(serviceDetail, "name", locale)}
                </p>
              </div>
            )}

            {loadingDetail && (
              <p className="text-sm text-muted">{t("loadingService")}</p>
            )}
            {loadError && (
              <p className="text-sm text-accent">{t("loadError")}</p>
            )}

            {serviceDetail && !loadingDetail && (
              <>
                <div>
                  <span className="text-sm font-medium text-fg">
                    {t("variantLabel")}
                  </span>
                  <div className="mt-1.5 flex flex-col gap-2">
                    {serviceDetail.variants.map((v) => {
                      const isActive = variantId === String(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVariantId(String(v.id))}
                          aria-pressed={isActive}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-start text-sm transition-colors ${
                            isActive
                              ? "border-brand bg-brand-soft"
                              : "border-border bg-surface hover:border-border-strong"
                          }`}
                        >
                          <span className="font-medium text-fg">
                            {pickRequired(v, "brand_name", locale)}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {v.active_offer ? (
                              <>
                                <span className="text-xs text-faint line-through">
                                  {formatUsd(v.price_usd)}
                                </span>
                                <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                                  <bdi>
                                    {t("offerPriceSyp", {
                                      price: Number(
                                        v.active_offer.offer_price_syp,
                                      ).toLocaleString("en-US"),
                                    })}
                                  </bdi>
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold text-fg">
                                {formatUsd(v.price_usd)}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.variant && (
                    <p className="mt-1.5 text-xs text-accent">
                      {fieldErrors.variant}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-sm font-medium text-fg">
                    {t("doctorLabel")}
                  </span>
                  {serviceDetail.doctors.length === 0 ? (
                    <p className="mt-1.5 text-sm text-muted">
                      {t("noDoctors")}
                    </p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {serviceDetail.doctors.map((d) => {
                        const isActive = doctorId === String(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDoctorId(String(d.id))}
                            aria-pressed={isActive}
                            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? "border-brand bg-brand text-brand-fg"
                                : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
                            }`}
                          >
                            {pickRequired(d, "name", locale)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {fieldErrors.doctor && (
                    <p className="mt-1.5 text-xs text-accent">
                      {fieldErrors.doctor}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="booking-name" className="text-sm font-medium text-fg">
                {t("nameLabel")}
              </label>
              <input
                id="booking-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-accent">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="booking-phone" className="text-sm font-medium text-fg">
                {t("phoneLabel")}
              </label>
              <div
                dir="ltr"
                className={`mt-1.5 flex items-stretch rounded-lg border bg-surface text-fg ${
                  fieldErrors.phone ? "border-accent" : "border-border"
                }`}
              >
                <CountrySelect
                  value={country}
                  onChange={handleCountryChange}
                  locale={locale}
                  label={t("countryLabel")}
                  searchPlaceholder={t("countrySearchPlaceholder")}
                />
                <input
                  id="booking-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  autoComplete="tel-national"
                  dir="ltr"
                  className="min-w-0 flex-1 rounded-e-lg bg-transparent px-3 py-2.5 text-start text-sm text-fg outline-none"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1.5 text-xs text-accent">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="booking-day" className="text-sm font-medium text-fg">
                {t("dayLabel")}
              </label>
              <input
                id="booking-day"
                type="date"
                min={today}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
              {fieldErrors.day && (
                <p className="mt-1.5 text-xs text-accent">{fieldErrors.day}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !serviceDetail}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
