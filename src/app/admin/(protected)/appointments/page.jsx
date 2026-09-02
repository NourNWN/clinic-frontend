"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { getAdminAppointments, updateAppointment } from "@/lib/adminApi";
import { pickRequired } from "@/lib/localized";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Icon } from "@/components/Icon";

const TABS = ["all", "calls", "followup"];

/** Each tab is a different query against the same GET endpoint. */
function queryForTab(tab, tomorrow) {
  if (tab === "calls") {
    return { day: tomorrow, reminder_call_status: "not_called" };
  }
  if (tab === "followup") {
    return { needs_followup: "true" };
  }
  return {};
}

/**
 * After a PATCH, re-checks whether an appointment still belongs in each
 * tab's list — mirrors the backend filter each tab's GET query applies, so
 * an optimistic/confirmed update can drop a row without a refetch (e.g. a
 * call-list action sets reminder_call_status away from "not_called", so
 * the row no longer matches the "calls" tab's own query).
 */
const TAB_MATCHERS = {
  all: () => true,
  calls: (a) => a.reminder_call_status === "not_called",
  followup: (a) => !a.followup_sent,
};

function todayLocalIso(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatPrice(value) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("en-US");
}

const STATUS_STYLES = {
  pending: "bg-surface-2 text-muted",
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rescheduled: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  completed: "bg-brand-soft text-brand",
  no_show: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-surface-2 text-muted"
      }`}
    >
      {label}
    </span>
  );
}

export default function AdminAppointmentsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.appointments");

  const [tomorrow] = useState(() => todayLocalIso(1));
  const [activeTab, setActiveTab] = useState("all");
  const [tabsState, setTabsState] = useState(() =>
    Object.fromEntries(
      TABS.map((tab) => [tab, { data: null, loading: true, error: null }]),
    ),
  );
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [actionError, setActionError] = useState(null);

  const loadTab = useCallback(
    async (tab) => {
      setTabsState((s) => ({
        ...s,
        [tab]: { ...s[tab], loading: true, error: null },
      }));
      try {
        const data = await getAdminAppointments(queryForTab(tab, tomorrow));
        setTabsState((s) => ({ ...s, [tab]: { data, loading: false, error: null } }));
      } catch (err) {
        setTabsState((s) => ({
          ...s,
          [tab]: { data: s[tab].data, loading: false, error: err },
        }));
      }
    },
    [tomorrow],
  );

  useEffect(() => {
    TABS.forEach(loadTab);
  }, [loadTab]);

  /** Applies `updated` to every tab's cached list, then drops it from any
   * tab it no longer matches — keeps all three views consistent without a
   * full refetch. */
  function applyToAllTabs(state, updated) {
    const next = {};
    for (const tab of TABS) {
      const { data } = state[tab];
      next[tab] = {
        ...state[tab],
        data: data
          ? data.map((a) => (a.id === updated.id ? updated : a)).filter(TAB_MATCHERS[tab])
          : data,
      };
    }
    return next;
  }

  async function runAction(appointment, changes) {
    const optimistic = { ...appointment, ...changes };
    let snapshot;
    setPendingIds((s) => new Set(s).add(appointment.id));
    setActionError(null);
    setTabsState((s) => {
      snapshot = s;
      return applyToAllTabs(s, optimistic);
    });

    try {
      const updated = await updateAppointment(appointment.id, changes);
      setTabsState((s) => applyToAllTabs(s, updated));
    } catch (err) {
      setTabsState(snapshot);
      setActionError(
        err instanceof ApiError && err.code
          ? pickRequired(err, "message", locale)
          : t("actionGenericError"),
      );
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(appointment.id);
        return next;
      });
    }
  }

  function quickChanges(kind, extra) {
    const inCallsTab = activeTab === "calls";
    const byKind = {
      confirm: {
        status: "confirmed",
        ...(inCallsTab && { reminder_call_status: "called_confirmed" }),
      },
      cancel: {
        status: "cancelled",
        ...(inCallsTab && { reminder_call_status: "called_cancelled" }),
      },
      reschedule: {
        status: "rescheduled",
        ...(inCallsTab && { reminder_call_status: "called_rescheduled" }),
        ...extra,
      },
    };
    return byKind[kind];
  }

  function openReschedule(appointment) {
    setReschedulingId(appointment.id);
    setRescheduleDate(appointment.preferred_day);
  }

  function closeReschedule() {
    setReschedulingId(null);
    setRescheduleDate("");
  }

  function submitReschedule(appointment) {
    if (!rescheduleDate) return;
    runAction(appointment, quickChanges("reschedule", { preferred_day: rescheduleDate }));
    closeReschedule();
  }

  const tab = tabsState[activeTab];
  const rows = tab.data ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader backHref="/admin" />

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t("title")}
        </h1>

        {/* ---------------- Tabs ---------------- */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-px">
          {TABS.map((tabKey) => {
            const isActive = tabKey === activeTab;
            const count = tabsState[tabKey].data?.length;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-brand text-fg"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {t(`tabs.${tabKey}`)}
                {typeof count === "number" && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold ${
                      isActive
                        ? "bg-brand text-brand-fg"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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

        {/* ---------------- Content ---------------- */}
        <div className="mt-6">
          {tab.loading && !tab.data ? (
            <p className="py-16 text-center text-sm text-muted">{t("loading")}</p>
          ) : tab.error && !tab.data ? (
            <div className="py-16 text-center">
              <p className="text-sm text-accent">{t("loadError")}</p>
              <button
                type="button"
                onClick={() => loadTab(activeTab)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
              >
                {t("retry")}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              {t(`empty.${activeTab}`)}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
              <table className="w-full min-w-[900px] text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-faint">
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.patient")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.service")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.doctor")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.day")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.price")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium">
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const isPending = pendingIds.has(a.id);
                    const isRescheduling = reschedulingId === a.id;
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-fg">{a.patient_name}</div>
                          <div dir="ltr" className="mt-0.5 text-xs text-faint">
                            {a.patient_phone}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-fg">
                          <div>{a.service_variant.service_name_ar}</div>
                          <div className="mt-0.5 text-xs text-faint">
                            {a.service_variant.brand_name_ar}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-fg">{a.doctor.name_ar}</td>
                        <td className="px-4 py-3.5 text-fg">{a.preferred_day}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={a.status} label={t(`status.${a.status}`)} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-fg">
                          <bdi>
                            {t("table.priceValue", {
                              price: formatPrice(a.final_price_syp_at_booking),
                            })}
                          </bdi>
                        </td>
                        <td className="px-4 py-3.5">
                          {activeTab === "followup" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => runAction(a, { followup_sent: true })}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Icon name="check" size={13} />
                              {t("actions.markSent")}
                            </button>
                          ) : isRescheduling ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={rescheduleDate}
                                min={todayLocalIso()}
                                onChange={(e) => setRescheduleDate(e.target.value)}
                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-fg"
                              />
                              <button
                                type="button"
                                disabled={isPending || !rescheduleDate}
                                onClick={() => submitReschedule(a)}
                                className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-fg transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {t("actions.rescheduleSubmit")}
                              </button>
                              <button
                                type="button"
                                onClick={closeReschedule}
                                aria-label={t("actions.rescheduleCancel")}
                                className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:bg-surface-2"
                              >
                                <Icon name="close" size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => runAction(a, quickChanges("confirm"))}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-emerald-400"
                              >
                                {t("actions.confirm")}
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => runAction(a, quickChanges("cancel"))}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-rose-500 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-rose-400"
                              >
                                {t("actions.cancel")}
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => openReschedule(a)}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-sky-500 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-sky-400"
                              >
                                {t("actions.reschedule")}
                              </button>
                            </div>
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
