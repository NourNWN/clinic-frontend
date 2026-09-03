"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, getCategories } from "@/lib/api";
import {
  createService,
  getAdminConcerns,
  getAdminDoctors,
  getAdminServices,
  updateService,
} from "@/lib/adminApi";
import { getSession } from "@/lib/adminAuth";
import { pickRequired } from "@/lib/localized";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ServiceEditor } from "@/components/admin/ServiceEditor";
import { Icon } from "@/components/Icon";

function formatUsd(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Price range across the variants a patient can actually book — the public
 * site derives its price preview from available variants only, so an
 * unavailable brand must not widen the range shown here.
 */
function priceRange(service) {
  const prices = service.variants
    .filter((v) => v.is_available)
    .map((v) => Number(v.price_usd))
    .filter((n) => !Number.isNaN(n));

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatUsd(min) : `${formatUsd(min)} – ${formatUsd(max)}`;
}

export default function AdminServicesPage() {
  const locale = useLocale();
  const t = useTranslations("admin.services");

  // Managing the catalogue is manager-only server-side (every write here
  // answers 403 for reception), so the controls that would call those routes
  // are hidden rather than left to fail. Safe to read synchronously: the
  // (protected) layout only mounts this page client-side, after it has
  // confirmed a session exists.
  const [user] = useState(() => getSession()?.user ?? null);
  const isManager = user?.role === "manager";

  const [services, setServices] = useState(null);
  const [categories, setCategories] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pending, setPending] = useState(false);
  // { mode: "list" } | { mode: "create" } | { mode: "edit", id }
  const [view, setView] = useState({ mode: "list" });

  // Every state update here lands after the await, so this stays safe to
  // call straight from an effect.
  const load = useCallback(async () => {
    try {
      const [servicesData, categoriesData, concernsData, doctorsData] =
        await Promise.all([
          getAdminServices(),
          getCategories(),
          getAdminConcerns(),
          getAdminDoctors(),
        ]);
      setServices(servicesData);
      setCategories(categoriesData);
      setConcerns(concernsData);
      setDoctors(doctorsData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount is what this effect is for; the rule can't see that
    // load()'s state updates all land after its await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function describeError(err) {
    return err instanceof ApiError && err.code
      ? pickRequired(err, "message", locale)
      : t("genericError");
  }

  /** Saves the service-level fields (create or update) and returns the
   * saved service, or null if the API rejected it. */
  async function handleSave(payload) {
    setPending(true);
    setActionError(null);
    try {
      if (view.mode === "create") {
        const created = await createService(payload);
        setServices((prev) => [...(prev ?? []), created]);
        // Straight into edit mode, where brands can be added.
        setView({ mode: "edit", id: created.id });
        return created;
      }
      const updated = await updateService(view.id, payload);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setView({ mode: "list" });
      return updated;
    } catch (err) {
      setActionError(describeError(err));
      return null;
    } finally {
      setPending(false);
    }
  }

  /** Optimistic availability toggle, mirroring the appointments screen:
   * apply locally, then reconcile with the server or roll back. */
  async function handleToggleVariant(service, variant) {
    const optimistic = {
      ...service,
      variants: service.variants.map((v) =>
        v.id === variant.id ? { ...v, is_available: !v.is_available } : v,
      ),
    };

    let snapshot;
    setActionError(null);
    setPending(true);
    setServices((prev) => {
      snapshot = prev;
      return prev.map((s) => (s.id === service.id ? optimistic : s));
    });

    try {
      const updated = await updateService(service.id, {
        variants: [{ id: variant.id, is_available: !variant.is_available }],
      });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setServices(snapshot);
      setActionError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  async function handleAddVariant(service, variant) {
    setActionError(null);
    try {
      // A variants array without an `id` appends; the ones already on the
      // service are left untouched, so only the new brand is sent.
      const updated = await updateService(service.id, { variants: [variant] });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      return true;
    } catch (err) {
      setActionError(describeError(err));
      return false;
    }
  }

  const selected =
    view.mode === "edit" ? services?.find((s) => s.id === view.id) ?? null : null;

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader backHref="/admin" />

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t("title")}
          </h1>
          {view.mode === "list" && isManager && (
            <button
              type="button"
              onClick={() => setView({ mode: "create" })}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
            >
              <Icon name="sparkles" size={16} />
              {t("newService")}
            </button>
          )}
          {view.mode === "list" && !isManager && (
            <p className="text-sm text-muted">{t("readOnlyNote")}</p>
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
          {!services && !loadError ? (
            <p className="py-16 text-center text-sm text-muted">{t("loading")}</p>
          ) : loadError && !services ? (
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
            <ServiceEditor
              key={view.mode === "edit" ? view.id : "new"}
              service={selected}
              categories={categories}
              concerns={concerns}
              doctors={doctors}
              pending={pending}
              onSave={handleSave}
              onAddVariant={(variant) => handleAddVariant(selected, variant)}
              onToggleVariant={(variant) => handleToggleVariant(selected, variant)}
              onCancel={() => {
                setActionError(null);
                setView({ mode: "list" });
              }}
            />
          ) : services.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
              <table className="w-full min-w-[760px] text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-faint">
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.name")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.category")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.priceRange")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.brands")}
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
                  {services.map((s) => {
                    const range = priceRange(s);
                    const availableCount = s.variants.filter(
                      (v) => v.is_available,
                    ).length;
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-fg">
                            {pickRequired(s, "name", locale)}
                          </div>
                          {s.duration_estimate != null && (
                            <div className="mt-0.5 text-xs text-faint">
                              {t("minutes", { count: s.duration_estimate })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-fg">
                          {pickRequired(s.category, "name", locale)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-fg">
                          {range ? <bdi>{range}</bdi> : <span className="text-faint">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-fg">
                          {s.variants.length === 0 ? (
                            <span className="text-faint">{t("noBrands")}</span>
                          ) : (
                            <bdi>
                              {t("brandsCount", {
                                available: availableCount,
                                total: s.variants.length,
                              })}
                            </bdi>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              s.is_available
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-surface-2 text-muted"
                            }`}
                          >
                            {s.is_available ? t("status.available") : t("status.hidden")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => setView({ mode: "edit", id: s.id })}
                              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand"
                            >
                              {t("edit")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
