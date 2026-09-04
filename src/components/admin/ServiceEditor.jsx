"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { pickRequired } from "@/lib/localized";
import { Icon } from "@/components/Icon";
import { PhotoUrlField } from "./PhotoUrlField";

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg";

/** "" -> null so the API gets a real null rather than an empty string. */
function orNull(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function formatUsd(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Toggleable chips rather than a native <select multiple>, which is
 * awkward to use and worse in RTL. Same pattern as the booking modal's
 * specialist picker.
 */
function ChipMultiSelect({ label, options, selectedIds, onToggle, emptyText, suffix }) {
  const locale = useLocale();

  return (
    <div>
      <span className="text-sm font-medium text-fg">{label}</span>
      {options.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(option.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
                }`}
              >
                {pickRequired(option, "name", locale)}
                {suffix?.(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Create/edit form for one service. Variants are only manageable once the
 * service exists (they hang off its id), so the brands section is hidden
 * while creating.
 */
export function ServiceEditor({
  service,
  categories,
  concerns,
  doctors,
  onSave,
  onAddVariant,
  onToggleVariant,
  onUpdateVariant,
  onCancel,
  pending,
}) {
  const locale = useLocale();
  const t = useTranslations("admin.services");
  const isCreate = !service;

  const [form, setForm] = useState(() => ({
    name_ar: service?.name_ar ?? "",
    name_en: service?.name_en ?? "",
    description_ar: service?.description_ar ?? "",
    description_en: service?.description_en ?? "",
    category_id: service?.category_id ? String(service.category_id) : "",
    duration_estimate:
      service?.duration_estimate == null ? "" : String(service.duration_estimate),
    photo_url: service?.photo_url ?? "",
    is_available: service?.is_available ?? true,
  }));

  const [concernIds, setConcernIds] = useState(
    () => service?.concerns?.map((c) => c.id) ?? [],
  );
  const [doctorIds, setDoctorIds] = useState(
    () => service?.doctors?.map((d) => d.id) ?? [],
  );

  const [newVariant, setNewVariant] = useState({
    brand_name_ar: "",
    brand_name_en: "",
    price_usd: "",
    photo_url: "",
  });
  const [addingVariant, setAddingVariant] = useState(false);

  // Per-brand photo edits, keyed by variant id. A brand is only in here once
  // it has been typed into; everything else falls back to the saved value,
  // so a save elsewhere on the page doesn't strand a stale draft.
  const [photoDrafts, setPhotoDrafts] = useState({});
  const [savingPhotoId, setSavingPhotoId] = useState(null);

  function variantPhoto(v) {
    return photoDrafts[v.id] ?? v.photo_url ?? "";
  }

  async function saveVariantPhoto(v) {
    setSavingPhotoId(v.id);
    const ok = await onUpdateVariant(v, { photo_url: variantPhoto(v).trim() });
    setSavingPhotoId(null);
    if (ok) {
      setPhotoDrafts((drafts) => {
        const { [v.id]: _saved, ...rest } = drafts;
        return rest;
      });
    }
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleId(setter) {
    return (id) =>
      setter((ids) =>
        ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id],
      );
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Required fields are deliberately left to the API so its bilingual
    // validation messages stay the single source of truth.
    onSave({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      description_ar: orNull(form.description_ar),
      description_en: orNull(form.description_en),
      category_id: form.category_id ? Number(form.category_id) : null,
      duration_estimate:
        form.duration_estimate === "" ? null : Number(form.duration_estimate),
      photo_url: orNull(form.photo_url),
      is_available: form.is_available,
      // Sent every save: the form holds the full intended set, and the API
      // replaces rather than merges.
      concern_ids: concernIds,
      doctor_ids: doctorIds,
    });
  }

  async function handleAddVariant(e) {
    e.preventDefault();
    setAddingVariant(true);
    const ok = await onAddVariant({
      brand_name_ar: newVariant.brand_name_ar.trim(),
      brand_name_en: newVariant.brand_name_en.trim(),
      price_usd: newVariant.price_usd,
      photo_url: orNull(newVariant.photo_url),
    });
    setAddingVariant(false);
    if (ok) {
      setNewVariant({
        brand_name_ar: "",
        brand_name_en: "",
        price_usd: "",
        photo_url: "",
      });
    }
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
          {isCreate ? t("editor.createTitle") : pickRequired(service, "name", locale)}
        </h2>
      </div>

      {/* ---------------- Service fields ---------------- */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-border bg-surface p-6 shadow-card"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="svc-name-ar" className="text-sm font-medium text-fg">
              {t("editor.nameAr")}
            </label>
            <input
              id="svc-name-ar"
              type="text"
              dir="rtl"
              value={form.name_ar}
              onChange={(e) => setField("name_ar", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="svc-name-en" className="text-sm font-medium text-fg">
              {t("editor.nameEn")}
            </label>
            <input
              id="svc-name-en"
              type="text"
              dir="ltr"
              value={form.name_en}
              onChange={(e) => setField("name_en", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="svc-category" className="text-sm font-medium text-fg">
              {t("editor.category")}
            </label>
            <select
              id="svc-category"
              value={form.category_id}
              onChange={(e) => setField("category_id", e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">{t("editor.selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickRequired(c, "name", locale)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="svc-duration" className="text-sm font-medium text-fg">
              {t("editor.duration")}
            </label>
            <input
              id="svc-duration"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.duration_estimate}
              onChange={(e) => setField("duration_estimate", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <PhotoUrlField
            id="svc-photo"
            className="sm:col-span-2"
            label={t("editor.photoUrl")}
            value={form.photo_url}
            onChange={(value) => setField("photo_url", value)}
          />

          <div className="sm:col-span-2">
            <label htmlFor="svc-desc-ar" className="text-sm font-medium text-fg">
              {t("editor.descriptionAr")}
            </label>
            <textarea
              id="svc-desc-ar"
              dir="rtl"
              rows={2}
              value={form.description_ar}
              onChange={(e) => setField("description_ar", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="svc-desc-en" className="text-sm font-medium text-fg">
              {t("editor.descriptionEn")}
            </label>
            <textarea
              id="svc-desc-en"
              dir="ltr"
              rows={2}
              value={form.description_en}
              onChange={(e) => setField("description_en", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
          <ChipMultiSelect
            label={t("editor.concerns")}
            options={concerns}
            selectedIds={concernIds}
            onToggle={toggleId(setConcernIds)}
            emptyText={t("editor.noConcerns")}
          />
          <ChipMultiSelect
            label={t("editor.doctors")}
            options={doctors}
            selectedIds={doctorIds}
            onToggle={toggleId(setDoctorIds)}
            emptyText={t("editor.noDoctors")}
            // Unavailable doctors are still listed so an existing link is
            // never silently dropped, but they're marked as such.
            suffix={(d) =>
              d.is_available === false ? (
                <span className="ms-1.5 text-xs opacity-70">
                  {t("editor.doctorUnavailable")}
                </span>
              ) : null
            }
          />
        </div>

        <label className="mt-5 flex w-fit items-center gap-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.is_available}
            onChange={(e) => setField("is_available", e.target.checked)}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          {t("editor.isAvailable")}
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t("editor.saving") : t("editor.save")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
          >
            {t("editor.cancel")}
          </button>
        </div>
      </form>

      {/* ---------------- Variants (brands) ---------------- */}
      {!isCreate && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-base font-semibold tracking-tight text-fg">
            {t("variants.title")}
          </h3>

          {service.variants.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("variants.empty")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {service.variants.map((v) => (
                <li
                  key={v.id}
                  className="rounded-xl border border-border bg-surface-2/60 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg">
                        {pickRequired(v, "brand_name", locale)}
                      </div>
                      <div className="mt-0.5 text-xs text-faint">
                        <bdi>{formatUsd(v.price_usd)}</bdi>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onToggleVariant(v)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        v.is_available
                          ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-surface-2 text-muted hover:bg-surface-2/80"
                      }`}
                    >
                      <Icon name={v.is_available ? "check" : "close"} size={13} />
                      {v.is_available
                        ? t("variants.available")
                        : t("variants.unavailable")}
                    </button>
                  </div>

                  {/* Saved on its own, not with the service form above: the
                      brands section already works one brand at a time. */}
                  <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
                    <PhotoUrlField
                      id={`variant-photo-${v.id}`}
                      className="min-w-0 flex-1"
                      label={t("variants.photoUrl")}
                      value={variantPhoto(v)}
                      onChange={(value) =>
                        setPhotoDrafts((drafts) => ({ ...drafts, [v.id]: value }))
                      }
                      compact
                      inputClassName="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                    <button
                      type="button"
                      disabled={
                        pending ||
                        savingPhotoId === v.id ||
                        photoDrafts[v.id] === undefined
                      }
                      onClick={() => saveVariantPhoto(v)}
                      className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingPhotoId === v.id
                        ? t("variants.savingPhoto")
                        : t("variants.savePhoto")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleAddVariant}
            noValidate
            className="mt-6 border-t border-border pt-5"
          >
            <h4 className="text-sm font-medium text-fg">{t("variants.addTitle")}</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                dir="rtl"
                aria-label={t("variants.brandAr")}
                placeholder={t("variants.brandAr")}
                value={newVariant.brand_name_ar}
                onChange={(e) =>
                  setNewVariant((v) => ({ ...v, brand_name_ar: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
              <input
                type="text"
                dir="ltr"
                aria-label={t("variants.brandEn")}
                placeholder={t("variants.brandEn")}
                value={newVariant.brand_name_en}
                onChange={(e) =>
                  setNewVariant((v) => ({ ...v, brand_name_en: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                aria-label={t("variants.priceUsd")}
                placeholder={t("variants.priceUsd")}
                value={newVariant.price_usd}
                onChange={(e) =>
                  setNewVariant((v) => ({ ...v, price_usd: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
            </div>
            <PhotoUrlField
              id="new-variant-photo"
              className="mt-3"
              label={t("variants.photoUrl")}
              value={newVariant.photo_url}
              onChange={(value) =>
                setNewVariant((v) => ({ ...v, photo_url: value }))
              }
            />
            <button
              type="submit"
              disabled={addingVariant || pending}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addingVariant ? t("variants.adding") : t("variants.add")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
