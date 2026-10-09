"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { createDoctor, getAdminDoctors, updateDoctor } from "@/lib/adminApi";
import { getSession } from "@/lib/adminAuth";
import { pick, pickRequired } from "@/lib/localized";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DoctorEditor } from "@/components/admin/DoctorEditor";
import { Icon } from "@/components/Icon";

export default function AdminDoctorsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.doctors");
  const [user] = useState(() => getSession()?.user ?? null);
  const isManager = user?.role === "manager";
  const [doctors, setDoctors] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pending, setPending] = useState(false);
  const [view, setView] = useState({ mode: "list" });

  const load = useCallback(async () => {
    try {
      setDoctors(await getAdminDoctors());
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    }
  }, []);

  useEffect(() => {
    if (!isManager) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isManager, load]);

  function describeError(error) {
    return error instanceof ApiError && error.code
      ? pickRequired(error, "message", locale)
      : t("genericError");
  }

  async function handleSave(payload) {
    setPending(true);
    setActionError(null);
    try {
      if (view.mode === "create") {
        const created = await createDoctor(payload);
        setDoctors((current) => [...(current ?? []), created]);
      } else {
        const updated = await updateDoctor(view.id, payload);
        setDoctors((current) => current.map((doctor) =>
          doctor.id === updated.id ? updated : doctor,
        ));
      }
      setView({ mode: "list" });
    } catch (error) {
      setActionError(describeError(error));
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
            <h1 className="mt-5 text-lg font-semibold text-fg">{t("forbiddenTitle")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("forbiddenBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  const selected = view.mode === "edit"
    ? doctors?.find((doctor) => doctor.id === view.id) ?? null
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader backHref="/admin" />
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("title")}</h1>
          {view.mode === "list" && (
            <button type="button" onClick={() => { setActionError(null); setView({ mode: "create" }); }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover">
              <Icon name="user" size={16} />
              {t("newDoctor")}
            </button>
          )}
        </div>

        {actionError && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-accent-soft px-3.5 py-2.5 text-sm text-accent">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} aria-label={t("dismiss")}
              className="shrink-0 rounded-md p-1 hover:bg-black/5"><Icon name="close" size={14} /></button>
          </div>
        )}

        <div className="mt-6">
          {!doctors && !loadError ? (
            <p className="py-16 text-center text-sm text-muted">{t("loading")}</p>
          ) : loadError && !doctors ? (
            <div className="py-16 text-center">
              <p className="text-sm text-accent">{t("loadError")}</p>
              <button type="button" onClick={() => { setLoadError(null); load(); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2">{t("retry")}</button>
            </div>
          ) : view.mode !== "list" ? (
            <DoctorEditor key={view.mode === "edit" ? view.id : "new"} doctor={selected}
              pending={pending} onSave={handleSave} onCancel={() => { setActionError(null); setView({ mode: "list" }); }} />
          ) : doctors.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
              <table className="w-full min-w-[680px] text-start text-sm">
                <thead><tr className="border-b border-border text-xs font-medium text-faint">
                  <th className="px-4 py-3 text-start font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("table.specialty")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("table.actions")}</th>
                </tr></thead>
                <tbody>{doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3.5 font-medium text-fg">{pickRequired(doctor, "name", locale)}</td>
                    <td className="px-4 py-3.5 text-fg">{pick(doctor, "specialty", locale) ?? <span className="text-faint">—</span>}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${doctor.is_available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-surface-2 text-muted"}`}>
                      {doctor.is_available ? t("status.available") : t("status.unavailable")}
                    </span></td>
                    <td className="px-4 py-3.5"><button type="button" onClick={() => setView({ mode: "edit", id: doctor.id })}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand">{t("edit")}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
