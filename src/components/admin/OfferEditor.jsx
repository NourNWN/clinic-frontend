"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getServiceDetail } from "@/lib/api";
import { pickRequired } from "@/lib/localized";
import { Icon } from "@/components/Icon";
import { PhotoUrlField } from "./PhotoUrlField";

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg";

function formatSyp(value) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("en-US");
}

function formatUsd(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * A saved item already carries its variant (and that variant's service) from
 * the offers endpoint, so an existing offer renders without fetching
 * anything. Rows the manager adds start empty and resolve their brand list
 * from getServiceDetail once a treatment is picked.
 */
function itemToRow(item) {
  return {
    key: `saved-${item.id}`,
    id: item.id,
    serviceId: item.service_variant.service_id,
    variantId: item.service_variant_id,
    price: String(item.offer_price_syp),
    // Kept so a saved row can name its brand even when the variant is no
    // longer bookable, and therefore absent from getServiceDetail.
    savedVariant: item.service_variant,
  };
}

let nextRowKey = 0;
function blankRow() {
  nextRowKey += 1;
  return {
    key: `new-${nextRowKey}`,
    id: null,
    serviceId: "",
    variantId: "",
    price: "",
    savedVariant: null,
  };
}

/**
 * Create/edit form for one offer. Prices are entered directly in SYP: an
 * offer price is a fixed promotional figure, deliberately independent of the
 * variant's USD price and the exchange rate, and each brand in the offer
 * carries its own.
 */
export function OfferEditor({ offer, services, onSave, onCancel, pending }) {
  const locale = useLocale();
  const t = useTranslations("admin.offers");
  const isCreate = !offer;

  const [form, setForm] = useState(() => ({
    title_ar: offer?.title_ar ?? "",
    title_en: offer?.title_en ?? "",
    start_date: offer?.start_date ?? "",
    end_date: offer?.end_date ?? "",
    photo_url: offer?.photo_url ?? "",
    is_active: offer?.is_active ?? true,
  }));

  // Only the live brands are editable here. A removed one keeps its row
  // server-side so past bookings still resolve, but it is not part of the
  // offer any more, so showing it would misrepresent what is on sale.
  const [rows, setRows] = useState(() => {
    const live = (offer?.items ?? []).filter((i) => i.is_active);
    return live.length ? live.map(itemToRow) : [blankRow()];
  });

  // serviceId -> { loading, variants } | { error }
  const [variantsByService, setVariantsByService] = useState({});
  const [formError, setFormError] = useState(null);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setFormError(null);
  }

  const loadVariants = useCallback(async (serviceId) => {
    setVariantsByService((m) =>
      m[serviceId] ? m : { ...m, [serviceId]: { loading: true, variants: [] } },
    );
    try {
      const detail = await getServiceDetail(serviceId);
      setVariantsByService((m) => ({
        ...m,
        [serviceId]: { loading: false, variants: detail.variants },
      }));
    } catch {
      // A treatment with nothing bookable left 404s here. Not an error state
      // for the form — the row just has no brands to offer.
      setVariantsByService((m) => ({
        ...m,
        [serviceId]: { loading: false, variants: [] },
      }));
    }
  }, []);

  // Saved rows already know their service, so their brand lists are fetched
  // up front — the dropdown has to be populated before the manager opens it.
  useEffect(() => {
    const needed = new Set(
      rows.map((r) => r.serviceId).filter((id) => id !== "" && id != null),
    );
    for (const serviceId of needed) {
      // Fetching for a newly-picked treatment is what this effect is for; the
      // rule can't see that the only synchronous update here is the loading
      // marker, which is guarded against re-entry.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!variantsByService[serviceId]) loadVariants(serviceId);
    }
  }, [rows, variantsByService, loadVariants]);

  function updateRow(key, changes) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)));
    setFormError(null);
  }

  function handleServiceChange(row, rawValue) {
    const serviceId = rawValue ? Number(rawValue) : "";
    // The brand belongs to the old treatment, so it can't survive the switch.
    updateRow(row.key, { serviceId, variantId: "", savedVariant: null });
  }

  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
    setFormError(null);
  }

  function removeRow(key) {
    setRows((rs) => {
      const next = rs.filter((r) => r.key !== key);
      return next.length ? next : [blankRow()];
    });
    setFormError(null);
  }

  /** Rows the manager actually filled in — a trailing blank row is ignored. */
  function completedRows() {
    return rows.filter(
      (r) => r.variantId !== "" && r.variantId != null && String(r.price).trim() !== "",
    );
  }

  function handleSubmit(e) {
    e.preventDefault();

    const items = completedRows();
    if (items.length === 0) {
      setFormError(t("editor.itemsRequired"));
      return;
    }

    const variantIds = items.map((r) => Number(r.variantId));
    if (new Set(variantIds).size !== variantIds.length) {
      setFormError(t("items.duplicate"));
      return;
    }

    // Checked here as well as server-side: the API answers the same 400, but
    // a date range is easy to get wrong and the inline message is faster.
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      setFormError(t("editor.dateRangeError"));
      return;
    }

    onSave({
      title_ar: form.title_ar.trim(),
      title_en: form.title_en.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      // "" -> null so a cleared field reaches the API as a real null.
      photo_url: form.photo_url.trim() === "" ? null : form.photo_url.trim(),
      is_active: form.is_active,
      items: items.map((r) => ({
        ...(r.id != null ? { id: r.id } : {}),
        service_variant_id: Number(r.variantId),
        offer_price_syp: r.price,
      })),
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
          {isCreate ? t("editor.createTitle") : pickRequired(offer, "title", locale)}
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* ---------------- Offer fields ---------------- */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="offer-title-ar" className="text-sm font-medium text-fg">
                {t("editor.titleAr")}
              </label>
              <input
                id="offer-title-ar"
                type="text"
                dir="rtl"
                value={form.title_ar}
                onChange={(e) => setField("title_ar", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="offer-title-en" className="text-sm font-medium text-fg">
                {t("editor.titleEn")}
              </label>
              <input
                id="offer-title-en"
                type="text"
                dir="ltr"
                value={form.title_en}
                onChange={(e) => setField("title_en", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="offer-start" className="text-sm font-medium text-fg">
                {t("editor.startDate")}
              </label>
              <input
                id="offer-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="offer-end" className="text-sm font-medium text-fg">
                {t("editor.endDate")}
              </label>
              <input
                id="offer-end"
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setField("end_date", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <PhotoUrlField
              id="offer-photo"
              className="sm:col-span-2"
              label={t("editor.photoUrl")}
              value={form.photo_url}
              onChange={(value) => setField("photo_url", value)}
            />
          </div>

          <label className="mt-5 flex w-fit items-center gap-2.5 text-sm text-fg">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField("is_active", e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            {t("editor.isActive")}
          </label>
        </div>

        {/* ---------------- Items ---------------- */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-base font-semibold tracking-tight text-fg">
            {t("items.title")}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {t("items.description")}
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {rows.map((row) => {
              const entry =
                row.serviceId === "" ? null : variantsByService[row.serviceId];
              const fetched = entry?.variants ?? [];
              // A saved brand that is no longer bookable won't come back from
              // getServiceDetail; keep it listed so editing the row's price
              // doesn't silently repoint it at a different brand.
              const options =
                row.savedVariant &&
                !fetched.some((v) => v.id === row.savedVariant.id)
                  ? [...fetched, row.savedVariant]
                  : fetched;

              return (
                <li
                  key={row.key}
                  className="rounded-xl border border-border bg-surface-2/60 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label className="text-xs font-medium text-muted">
                        {t("items.service")}
                      </label>
                      <select
                        value={row.serviceId}
                        onChange={(e) => handleServiceChange(row, e.target.value)}
                        aria-label={t("items.service")}
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
                      >
                        <option value="">{t("items.selectService")}</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {pickRequired(s, "name", locale)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted">
                        {t("items.variant")}
                      </label>
                      <select
                        value={row.variantId}
                        disabled={!row.serviceId || entry?.loading}
                        onChange={(e) =>
                          updateRow(row.key, {
                            variantId: e.target.value ? Number(e.target.value) : "",
                          })
                        }
                        aria-label={t("items.variant")}
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">
                          {entry?.loading
                            ? t("items.loadingVariants")
                            : row.serviceId && options.length === 0
                              ? t("items.noVariants")
                              : t("items.selectVariant")}
                        </option>
                        {options.map((v) => (
                          <option key={v.id} value={v.id}>
                            {pickRequired(v, "brand_name", locale)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label={t("items.remove")}
                        title={t("items.remove")}
                        className="mb-0.5 grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-rose-500 hover:text-rose-600"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-medium text-muted">
                      {t("items.priceSyp")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      dir="ltr"
                      value={row.price}
                      onChange={(e) => updateRow(row.key, { price: e.target.value })}
                      aria-label={t("items.priceSyp")}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-start text-sm text-fg sm:max-w-xs"
                    />
                    {(() => {
                      const chosen = options.find((v) => v.id === Number(row.variantId));
                      return chosen ? (
                        <p className="mt-1.5 text-xs text-faint">
                          <bdi>
                            {t("items.usualPrice", {
                              price: formatUsd(chosen.price_usd),
                            })}
                          </bdi>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={addRow}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
          >
            <Icon name="sparkles" size={14} />
            {t("items.add")}
          </button>

          <p className="mt-4 text-xs leading-relaxed text-faint">
            {t("items.replaceNote")}
          </p>
        </div>

        {formError && (
          <p className="rounded-lg border border-border bg-accent-soft px-3.5 py-2.5 text-sm text-accent">
            {formError}
          </p>
        )}

        <div className="flex items-center gap-3">
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
    </div>
  );
}

export { formatSyp };
