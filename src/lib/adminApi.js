import { adminFetch } from "./adminAuth";

function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      usp.set(key, value);
    }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * filters: { day, status, reminder_call_status, needs_followup } — all
 * optional and combinable, forwarded as-is to the query string.
 */
export const getAdminAppointments = (filters) =>
  adminFetch(`/api/admin/appointments${buildQuery(filters)}`);

/** changes: a partial subset of { status, confirmed_datetime, reminder_call_status, followup_sent, preferred_day }. */
export const updateAppointment = (id, changes) =>
  adminFetch(`/api/admin/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

/** filters: { category_id, is_available } — both optional. */
export const getAdminServices = (filters) =>
  adminFetch(`/api/admin/services${buildQuery(filters)}`);

export const getAdminConcerns = () => adminFetch("/api/admin/concerns");

/**
 * The admin list, not the public one: the public /api/doctors hides
 * unavailable doctors, which would silently drop them from a service's
 * selection the next time it was saved.
 */
export const getAdminDoctors = (filters) =>
  adminFetch(`/api/admin/doctors${buildQuery(filters)}`);

/**
 * payload: { category_id (int, required), name_ar, name_en (required),
 * description_ar, description_en, duration_estimate (int|null),
 * is_available, variants: [...] }.
 */
export const createService = (payload) =>
  adminFetch("/api/admin/services", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * Despite the PUT verb this endpoint patches: it only touches the fields
 * present in `changes`. A `variants` array updates entries that carry an
 * `id` and appends those without one — variants left out are untouched,
 * never deleted.
 */
export const updateService = (id, changes) =>
  adminFetch(`/api/admin/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });

/**
 * Manager-only. Updates the single in-effect rate in place and returns
 * { id, rate, updated_at, updated_by }. Reception gets a 403.
 */
export const updateExchangeRate = (rate) =>
  adminFetch("/api/admin/exchange-rate", {
    method: "PUT",
    body: JSON.stringify({ rate }),
  });

/**
 * Manager-only, like the rest of /api/admin/offers. `filters`: { is_active }.
 * Each offer arrives with its items already expanded — every item carries its
 * variant's brand names and its parent service's name — so the list and the
 * editor can render an existing offer without fetching anything else.
 */
export const getOffers = (filters) =>
  adminFetch(`/api/admin/offers${buildQuery(filters)}`);

/**
 * payload: { title_ar, title_en, start_date, end_date (both ISO yyyy-mm-dd),
 * is_active, items: [{ service_variant_id (int), offer_price_syp }] }.
 * `items` is required and must hold at least one entry, and a variant can
 * only appear once per offer.
 */
export const createOffer = (payload) =>
  adminFetch("/api/admin/offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * Despite the PUT verb this patches: only the fields present in `changes`
 * are touched. An `items` array is the offer's complete set of live brands —
 * entries are updated or added, and anything left out is flagged
 * is_active=false. Rows are never deleted (a past appointment's
 * offer_item_id may point at one), so re-adding a removed brand revives its
 * original row rather than opening a second one for the same variant.
 * Omitting `items` entirely leaves the current set untouched.
 */
export const updateOffer = (id, changes) =>
  adminFetch(`/api/admin/offers/${id}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });

/**
 * A soft-disable, not a row delete: the offer stays listed with
 * is_active=false (which is what takes it off the public site) and keeps its
 * items for the same FK-safety reason. Returns the updated offer.
 */
export const deleteOffer = (id) =>
  adminFetch(`/api/admin/offers/${id}`, { method: "DELETE" });
