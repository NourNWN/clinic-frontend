const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  return res.json();
}

/**
 * Every write endpoint answers errors as `{ error: { code, message_ar,
 * message_en } }` (400/404/503). This flattens that onto the thrown error so
 * callers can read `err.code` / `err.message_en` / `err.message_ar` directly.
 */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message_en || `Request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? null;
    this.message_ar = body?.error?.message_ar ?? null;
    this.message_en = body?.error?.message_en ?? null;
  }
}

async function postJson(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}

export const getCategories = () => getJson("/api/categories");
export const getConcerns = () => getJson("/api/concerns");
export const getDoctors = () => getJson("/api/doctors");
export const getServices = () => getJson("/api/services");
export const getServiceDetail = (id) => getJson(`/api/services/${id}`);

/**
 * Only the offers running today, each with the brands a patient can still
 * book. Unlike the admin listing this hides scheduled and expired offers,
 * withdrawn brands, and offers left with nothing to sell — so an empty array
 * means "no offers right now", not "something went wrong".
 */
export const getOffers = () => getJson("/api/offers");
export const getExchangeRate = () => getJson("/api/exchange-rate");
export const createAppointment = (payload) =>
  postJson("/api/appointments", payload);
