/**
 * The API returns every human-readable field twice — `name_en` / `name_ar`,
 * `description_en` / `description_ar`. This picks the one matching the active
 * locale, falling back to English if a translation is missing in the database.
 */
export function pick(item, field, locale) {
  const primary = item[`${field}_${locale}`];
  if (typeof primary === "string" && primary.trim()) return primary;

  const fallback = item[`${field}_en`];
  return typeof fallback === "string" && fallback.trim() ? fallback : null;
}

/** Same as `pick`, for fields the API always populates (names, titles). */
export function pickRequired(item, field, locale) {
  return pick(item, field, locale) ?? "";
}
