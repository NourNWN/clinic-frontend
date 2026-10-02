import { cache } from "react";
import { getOffers } from "./api";

/**
 * The offers running today, fetched at most once per request.
 *
 * Two server components need them: the root layout, to decide whether the
 * nav shows an Offers link at all, and the home page, to render the section
 * that link points at. React's `cache` collapses those into a single call,
 * which also keeps the two from disagreeing — a link to a section that isn't
 * there is worse than no link.
 *
 * Server-only: `cache` is meaningless in the browser, so this lives apart
 * from lib/api.js, which client components import.
 */
export const getLiveOffers = cache(async () => {
  try {
    return await getOffers();
  } catch {
    // Offers decorate the site rather than make it; losing them must not
    // take down the layout that wraps every page, admin included.
    return [];
  }
});
