import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 country code. */
export function flagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** Localized country name, falling back to the raw code if Intl can't resolve it. */
export function countryDisplayName(countryCode, locale) {
  try {
    const displayNames = new Intl.DisplayNames([locale === "ar" ? "ar" : "en"], {
      type: "region",
    });
    return displayNames.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

/** Every country the library supports, with a localized name and calling code, name-sorted. */
export function listCountries(locale) {
  return getCountries()
    .map((code) => ({
      code,
      name: countryDisplayName(code, locale),
      callingCode: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** E.164 form of a national number for the given country, or null if it can't be parsed. */
export function toE164(nationalNumber, countryCode) {
  const parsed = parsePhoneNumberFromString(nationalNumber, countryCode);
  return parsed ? parsed.format("E.164") : null;
}

export { isValidPhoneNumber };
