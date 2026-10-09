"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { ApiError } from "@/lib/api";
import { uploadImage } from "@/lib/adminApi";
import { pickRequired } from "@/lib/localized";

/** Mirrors the varchar(255) the API stores it in; the field caps typing so a
 * long paste is obvious here rather than coming back as a 400. */
export const MAX_PHOTO_URL = 255;

/**
 * A photo is a URL the API stores as a plain string — there is no upload
 * endpoint — so anything the browser can load works: an absolute address on
 * a CDN, or a path served from this app's own /public folder.
 *
 * The thumbnail is the whole point of the field: a typo in a URL is
 * invisible until something tries to render it, and the public site is the
 * wrong place to find out.
 */
export function PhotoUrlField({
  id,
  label,
  value,
  onChange,
  className = "",
  inputClassName,
  compact = false,
}) {
  const t = useTranslations("admin.photo");
  const locale = useLocale();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  // Held as the URL that failed rather than a boolean, so editing the field
  // clears the warning on its own without an effect to reset it.
  const [brokenUrl, setBrokenUrl] = useState(null);

  const trimmed = value.trim();
  const isBroken = trimmed !== "" && trimmed === brokenUrl;
  const box = compact ? "h-10 w-10" : "h-14 w-14";

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (error) {
      setUploadError(
        error instanceof ApiError && error.code
          ? pickRequired(error, "message", locale)
          : t("uploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <div className={`flex items-start gap-3 ${label ? "mt-1.5" : ""}`}>
        <div className="min-w-0 flex-1">
          <input
            id={id}
            type="url"
            dir="ltr"
            inputMode="url"
            maxLength={MAX_PHOTO_URL}
            placeholder={t("placeholder")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={
              inputClassName ??
              "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
            }
          />
          {isBroken && (
            <p className="mt-1.5 text-xs text-accent">{t("brokenUrl")}</p>
          )}
          {uploadError && (
            <p className="mt-1.5 text-xs text-accent">{uploadError}</p>
          )}
        </div>

        {trimmed && !isBroken ? (
          // The URL is free-form admin input, so next/image's host allowlist
          // cannot cover it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt=""
            onError={() => setBrokenUrl(trimmed)}
            className={`${box} shrink-0 rounded-lg border border-border object-cover`}
          />
        ) : (
          <div
            aria-hidden="true"
            className={`${box} grid shrink-0 place-items-center rounded-lg border border-dashed border-border text-faint`}
          >
            <Icon name="image" size={compact ? 14 : 18} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? t("uploading") : t("upload")}
        </button>
        <span className="text-xs text-faint">{t("uploadHint")}</span>
      </div>
    </div>
  );
}
