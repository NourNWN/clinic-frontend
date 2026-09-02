import { ApiError } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SESSION_KEY = "hiam_admin_session";
const LOGIN_PATH = "/admin/login";

/**
 * The admin session (JWT + user) lives in localStorage rather than an
 * httpOnly cookie. A cookie-based session would need every admin API call
 * proxied through a Next.js route handler so the server could attach the
 * Authorization header on the way to Flask — real Backend-for-Frontend
 * plumbing. That's the right long-term shape, but it's a lot of scaffolding
 * to stand up before a single admin screen exists. Trade-off accepted for
 * now: the token is readable by any script on the page (XSS risk), so this
 * should move to httpOnly cookies + a proxy layer before real patient/staff
 * data is on the line.
 */

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Returns the stored { token, user }, or null if nobody is logged in. */
export function getSession() {
  return readSession();
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * Calls POST /api/admin/login. On success, stores the session and returns
 * the user info. On failure, throws ApiError (same shape as lib/api.js)
 * carrying `code` / `message_ar` / `message_en` from the backend.
 */
export async function adminLogin(username, password) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: data.token, user: data.user }),
  );

  return data.user;
}

/**
 * Clears the stored session and sends the browser to the login page. Uses
 * a full navigation (not next/navigation's router) so it works from plain
 * functions with no router in scope, and so any in-memory app state is
 * wiped along with the session rather than surviving a client-side route
 * change.
 */
export function logout() {
  clearSession();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = LOGIN_PATH;
}

/**
 * fetch() wrapper for /api/admin/* endpoints. Attaches the bearer token
 * from the stored session, and if the backend answers 401 — token missing,
 * malformed, or expired — clears the stale session and redirects to login
 * so callers never have to special-case an expired session themselves.
 */
export async function adminFetch(path, options = {}) {
  const session = readSession();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    clearSession();
    // Same reasoning as logout() above — a full navigation, not a router push.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = LOGIN_PATH;
    // The redirect above is already underway — resolve to a promise that
    // never settles so callers don't go on to render with a 401 body.
    return new Promise(() => {});
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}
