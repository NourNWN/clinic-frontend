"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, getServices } from "@/lib/api";
import { createOffer, deleteOffer, getOffers, updateOffer } from "@/lib/adminApi";
import { getSession } from "@/lib/adminAuth";
import { pickRequired } from "@/lib/localized";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OfferEditor } from "@/components/admin/OfferEditor";
import { Icon } from "@/components/Icon";

/** Local calendar day as yyyy-mm-dd, to compare against the API's ISO dates. */
function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * "Live" is the same condition the public API applies when it decides
 * whether to surface an offer on a variant (services.py: is_active and
 * start_date <= today <= end_date) — the flag alone doesn't mean an offer
 * is reaching patients, so the badge distinguishes the four states.
 */
function offerState(offer, today) {
  if (!offer.is_active) return "inactive";
  if (today < offer.start_date) return "scheduled";
  if (today > offer.end_date) return "expired";
  return "live";
}

const STATE_STYLES = {
  live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  scheduled: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  expired: "bg-surface-2 text-muted",
  inactive: "bg-surface-2 text-muted",
};

export default function AdminOffersPage() {
  const locale = useLocale();
  const t = useTranslations("admin.offers");

  // Safe to read synchronously: the (protected) layout only mounts this page
  // client-side, after it has confirmed a session exists.
  const [user] = useState(() => getSession()?.user ?? null);
  const isManager = user?.role === "manager";

  const [today] = useState(() => todayIso());
  const [offers, setOffers] = useState(null);
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pending, setPending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  // { mode: "list" } | { mode: "create" } | { mode: "edit", id }
  const [view, setView] = useState({ mode: "list" });

  // Every state update here lands after the await, so this stays safe to
  // call straight from an effect.
  const load = useCallback(async () => {
    try {
      const [offersData, servicesData] = await Promise.all([
        getOffers(),
        getServices(),
      ]);
      setOffers(offersData);
      setServices(servicesData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    if (!isManager) return;
    // Fetching on mount is what this effect is for; the rule can't see that
    // load()'s state updates all land after its await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isManager, load]);

  function describeError(err) {
    return err instanceof ApiError && err.code
      ? pickRequired(err, "message", locale)
      : t("genericError");
  }

  async function handleSave(payload) {
    setPending(true);
    setActionError(null);
    try {
      if (view.mode === "create") {
        const created = await createOffer(payload);
        setOffers((prev) => [...(prev ?? []), created]);
      } else {
        const updated = await updateOffer(view.id, payload);
        setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
      setView({ mode: "list" });
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  /** DELETE is a soft-disable server-side, so the row stays — it just flips
   * to inactive, which is what takes it off the public site. */
  async function handleDeactivate(offer) {
    setPending(true);
    setActionError(null);
    try {
      const updated = await deleteOffer(offer.id);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setConfirmingId(null);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setPending(false);
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

  const selected =
    view.mode === "edit" ? offers?.find((o) => o.id === view.id) ?? null : null;

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader backHref="/admin" />

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t("title")}
          </h1>
          {view.mode === "list" && (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setView({ mode: "create" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
            >
              <Icon name="tag" size={16} />
              {t("newOffer")}
            </button>
          )}
        </div>

        {actionError && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-accent-soft px-3.5 py-2.5 text-sm text-accent">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label={t("dismiss")}
              className="shrink-0 rounded-md p-1 hover:bg-black/5"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <div className="mt-6">
          {!offers && !loadError ? (
            <p className="py-16 text-center text-sm text-muted">{t("loading")}</p>
          ) : loadError && !offers ? (
            <div className="py-16 text-center">
              <p className="text-sm text-accent">{t("loadError")}</p>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  load();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
              >
                {t("retry")}
              </button>
            </div>
          ) : view.mode !== "list" ? (
            <OfferEditor
              key={view.mode === "edit" ? view.id : "new"}
              offer={selected}
              services={services}
              pending={pending}
              onSave={handleSave}
              onCancel={() => {
                setActionError(null);
                setView({ mode: "list" });
              }}
            />
          ) : offers.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
              <table className="w-full min-w-[820px] text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-faint">
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.title")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.dates")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.items")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => {
                    const state = offerState(offer, today);
                    const isConfirming = confirmingId === offer.id;
                    // Removed brands keep their row server-side for booking
                    // history, so the count has to be of the live ones.
                    const liveItems = offer.items.filter((i) => i.is_active);
                    return (
                      <tr
                        key={offer.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-fg">
                            {pickRequired(offer, "title", locale)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-fg">
                          <bdi>
                            {t("table.dateRange", {
                              start: offer.start_date,
                              end: offer.end_date,
                            })}
                          </bdi>
                        </td>
                        <td className="px-4 py-3.5 text-fg">
                          <bdi>
                            {liveItems.length === 1
                              ? t("table.oneItem")
                              : t("table.itemsCount", { count: liveItems.length })}
                          </bdi>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATE_STYLES[state]}`}
                          >
                            {t(`status.${state}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isConfirming ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted">
                                {t("deactivateConfirm")}
                              </span>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => handleDeactivate(offer)}
                                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {t("deactivateSubmit")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
                              >
                                {t("deactivateCancel")}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError(null);
                                  setView({ mode: "edit", id: offer.id });
                                }}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand"
                              >
                                {t("edit")}
                              </button>
                              {offer.is_active && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionError(null);
                                    setConfirmingId(offer.id);
                                  }}
                                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                                >
                                  {t("deactivate")}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {confirmingId != null && (
                <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted">
                  {t("deactivateConfirmBody")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
