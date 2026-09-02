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
