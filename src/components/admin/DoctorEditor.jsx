"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { pickRequired } from "@/lib/localized";
import { Icon } from "@/components/Icon";
import { PhotoUrlField } from "./PhotoUrlField";

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg";

function orNull(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Create/edit form for one doctor. Service assignments remain managed from
 * each service's editor, where the full service-to-doctor relationship is
 * visible and can be changed together. */
export function DoctorEditor({ doctor, onSave, onCancel, pending }) {
  const locale = useLocale();
  const t = useTranslations("admin.doctors");
  const isCreate = !doctor;
  const [form, setForm] = useState(() => ({
    name_ar: doctor?.name_ar ?? "",
    name_en: doctor?.name_en ?? "",
    specialty_ar: doctor?.specialty_ar ?? "",
    specialty_en: doctor?.specialty_en ?? "",
    bio_ar: doctor?.bio_ar ?? "",
    bio_en: doctor?.bio_en ?? "",
    photo_url: doctor?.photo_url ?? "",
    is_available: doctor?.is_available ?? true,
  }));

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      specialty_ar: orNull(form.specialty_ar),
      specialty_en: orNull(form.specialty_en),
      bio_ar: orNull(form.bio_ar),
      bio_en: orNull(form.bio_en),
      photo_url: orNull(form.photo_url),
      is_available: form.is_available,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("editor.back")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-fg transition-colors hover:bg-surface-2"
        >
          <Icon name="arrow" size={16} className="rotate-180 rtl:rotate-0" />
        </button>
        <h2 className="text-lg font-semibold tracking-tight text-fg">
          {isCreate ? t("editor.createTitle") : pickRequired(doctor, "name", locale)}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-border bg-surface p-6 shadow-card"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="doctor-name-ar" className="text-sm font-medium text-fg">
              {t("editor.nameAr")}
            </label>
            <input id="doctor-name-ar" type="text" dir="rtl" value={form.name_ar}
              onChange={(event) => setField("name_ar", event.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="doctor-name-en" className="text-sm font-medium text-fg">
              {t("editor.nameEn")}
            </label>
            <input id="doctor-name-en" type="text" dir="ltr" value={form.name_en}
              onChange={(event) => setField("name_en", event.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="doctor-specialty-ar" className="text-sm font-medium text-fg">
              {t("editor.specialtyAr")}
            </label>
            <input id="doctor-specialty-ar" type="text" dir="rtl" value={form.specialty_ar}
              onChange={(event) => setField("specialty_ar", event.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="doctor-specialty-en" className="text-sm font-medium text-fg">
              {t("editor.specialtyEn")}
            </label>
            <input id="doctor-specialty-en" type="text" dir="ltr" value={form.specialty_en}
              onChange={(event) => setField("specialty_en", event.target.value)} className={FIELD_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <PhotoUrlField id="doctor-photo" label={t("editor.photoUrl")}
              value={form.photo_url} onChange={(value) => setField("photo_url", value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doctor-bio-ar" className="text-sm font-medium text-fg">
              {t("editor.bioAr")}
            </label>
            <textarea id="doctor-bio-ar" dir="rtl" rows={3} value={form.bio_ar}
              onChange={(event) => setField("bio_ar", event.target.value)} className={FIELD_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doctor-bio-en" className="text-sm font-medium text-fg">
              {t("editor.bioEn")}
            </label>
            <textarea id="doctor-bio-en" dir="ltr" rows={3} value={form.bio_en}
              onChange={(event) => setField("bio_en", event.target.value)} className={FIELD_CLASS} />
          </div>
        </div>

        <label className="mt-5 flex w-fit items-center gap-2.5 text-sm text-fg">
          <input type="checkbox" checked={form.is_available}
            onChange={(event) => setField("is_available", event.target.checked)}
            className="h-4 w-4 accent-[var(--brand)]" />
          {t("editor.isAvailable")}
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? t("editor.saving") : t("editor.save")}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
            {t("editor.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
