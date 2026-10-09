# Clinic Frontend

The public website and staff admin panel for Hiam Clinic, built with Next.js
(App Router) and Tailwind CSS. It is a pure client of the Flask API in
`clinic-backend` — it holds no database of its own.

## Running it

The backend has to be up first; every page on the site is rendered from its
data.

```bash
cp .env.local.example .env.local   # points at http://localhost:5000
npm install
npm run dev                        # http://localhost:3000
```

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Flask API. No trailing slash. |

Because the variable is `NEXT_PUBLIC_`, it is inlined into the browser
bundle at build time — a deployment must set it *before* `npm run build`,
not at boot.

## What's in here

| Path | Purpose |
| --- | --- |
| `src/app/page.jsx` | The public site: hero, categories, treatments, live offers, team. |
| `src/app/admin/` | Staff panel — appointments, catalogue, offers, exchange rate. |
| `src/components/` | Shared UI; `BookingModal` is the patient booking flow. |
| `src/lib/api.js` | Public API calls. `serverApi.js` is the server-only, request-cached wrapper. |
| `src/lib/adminApi.js` | Admin API calls, authenticated through `adminAuth.js`. |
| `messages/` | Arabic and English copy. Every user-facing string lives here. |

## Bilingual and RTL

The site ships Arabic and English. The active locale is resolved on the
server from a cookie, so `<html lang>` and `dir` are correct in the very
first response and a visitor never sees a flash of the wrong direction. The
colour theme works the same way.

Two consequences worth knowing before editing:

- **No user-facing string belongs in a component.** Add it to both
  `messages/ar.json` and `messages/en.json` and read it through
  `useTranslations` / `getTranslations`.
- **Content from the API is bilingual per field** (`name_ar` / `name_en`).
  Use the `pick` and `pickRequired` helpers in `src/lib/localized.js` rather
  than reaching for a field directly.

## Building

```bash
npm run build
npm run start
```

`npm run lint` runs ESLint. Both must be clean before a deployment.

## Known limitation

The admin session token is kept in `localStorage` and the `/admin` route
guard runs in the browser, so any script on the page can read the token
(an XSS risk) and the guard itself is not a security boundary. The API does
verify the token server-side on every request, so no data is exposed by
this — but before real patient data is on the line, the session should move
to an httpOnly cookie behind a Next.js proxy layer. The reasoning is written
up in `src/lib/adminAuth.js`.
