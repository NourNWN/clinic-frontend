"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, getExchangeRate } from "@/lib/api";
import { updateExchangeRate } from "@/lib/adminApi";
import { getSession } from "@/lib/adminAuth";
import { pickRequired } from "@/lib/localized";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Icon } from "@/components/Icon";

const SUCCESS_VISIBLE_MS = 4000;

/**
 * The API serialises naive UTC timestamps with no zone suffix, which
 * `new Date()` would otherwise read as local time and display off by the
 * viewer's offset.
 */
function parseUtc(value) {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function AdminExchangeRatePage() {
  const locale = useLocale();
  const t = useTranslations("admin.exchangeRate");

  // Safe to read synchronously: the (protected) layout only mounts this
  // page client-side, after it has confirmed a session exists.
  const [user] = useState(() => getSession()?.user ?? null);
  const isManager = user?.role === "manager";

  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const rate = await getExchangeRate();
      setCurrent(rate);
    } catch {
      // The endpoint answers 503 until a rate exists — not an error state
      // here, just an empty one the form below is there to resolve.
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isManager) return;
    // Fetching on mount is what this effect is for; the rule can't see that
    // load()'s state updates all land after its await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isManager, load]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [success]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess(false);

    const value = Number(input);
    if (input.trim() === "" || Number.isNaN(value) || value <= 0) {
      setFieldError(t("invalidRate"));
      return; // Nothing is sent — the value can't be valid server-side either.
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const updated = await updateExchangeRate(value);
      setCurrent({ rate: updated.rate, updated_at: updated.updated_at });
      setInput("");
      setSuccess(true);
    } catch (err) {
      setFieldError(
        err instanceof ApiError && err.code
          ? pickRequired(err, "message", locale)
          : t("genericError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isManager) {
    return (
      <div className="flex min-h-full flex-col">
        <AdminHeader backHref="/admin" />
        <div className="mx-auto w-full max-w-md flex-1 px-5 py-20 sm:px-8">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name="shield" size={22} />
            </span>
            <h1 className="mt-5 text-lg font-semibold text-fg">
              {t("forbiddenTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("forbiddenBody")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const updatedAt = parseUtc(current?.updated_at);

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader backHref="/admin" />

      <div className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("description")}
        </p>

        {/* ---------------- Current rate ---------------- */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
          <span className="eyebrow text-faint">{t("currentLabel")}</span>
          {loading ? (
            <p className="mt-4 text-sm text-muted">{t("loading")}</p>
          ) : current ? (
            <>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-fg">
                <bdi>
                  {t("rateValue", {
                    rate: Number(current.rate).toLocaleString("en-US"),
                  })}
                </bdi>
              </p>
              {updatedAt && (
                <p className="mt-3 text-xs text-faint">
                  {t("updatedAt", {
                    timestamp: updatedAt.toLocaleString(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("notSet")}</p>
          )}
        </div>

        {/* ---------------- Update form ---------------- */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-card"
        >
          <label htmlFor="new-rate" className="text-sm font-medium text-fg">
            {t("newRateLabel")}
          </label>
          <input
            id="new-rate"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            dir="ltr"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-start text-sm text-fg"
          />
          {fieldError && (
            <p className="mt-1.5 text-xs text-accent">{fieldError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("saving") : t("save")}
          </button>

          {success && (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-brand-soft px-3.5 py-2.5 text-sm text-brand"
            >
              <Icon name="check" size={15} className="shrink-0" />
              {t("success")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
