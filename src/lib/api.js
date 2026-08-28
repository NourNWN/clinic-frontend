const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  return res.json();
}

export const getCategories = () => getJson("/api/categories");
export const getConcerns = () => getJson("/api/concerns");
export const getDoctors = () => getJson("/api/doctors");
export const getServices = () => getJson("/api/services");
export const getExchangeRate = () => getJson("/api/exchange-rate");
