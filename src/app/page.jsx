import { getLocale, getTranslations } from "next-intl/server";
import {
  getCategories,
  getConcerns,
  getDoctors,
  getExchangeRate,
  getServices,
} from "@/lib/api";
import { getLiveOffers } from "@/lib/serverApi";
import { pick, pickRequired } from "@/lib/localized";
import { Icon, categoryIcon } from "@/components/Icon";
import { OffersSection } from "@/components/OffersSection";
import { ServicesExplorer } from "@/components/ServicesExplorer";

/** "Dr. Sara Ahmad" -> "SA", "د. سارة أحمد" -> "سأ" */
function initials(name) {
  return name
    .replace(/^(dr\.?|د\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow text-brand">{eyebrow}</span>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default async function Home() {
  const locale = await getLocale();
  const t = await getTranslations();

  let categories = [];
  let concerns = [];
  let services = [];
  let doctors = [];
  let offers = [];
  let rate = null;
  let failed = false;

  try {
    [categories, concerns, services, doctors, offers] = await Promise.all([
      getCategories(),
      getConcerns(),
      getServices(),
      getDoctors(),
      // Shared with the root layout, which needs the same answer to decide
      // whether the nav shows an Offers link. Already falls back to an empty
      // list on failure: offers decorate the page rather than make it.
      getLiveOffers(),
    ]);
    // The rate endpoint answers 503 until an admin sets one — not fatal.
    rate = await getExchangeRate().catch(() => null);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-md px-5 py-24">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="shield" size={22} />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-fg">
            {t("error.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("error.body")}
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    { value: services.length, label: t("hero.statTreatments") },
    { value: categories.length, label: t("hero.statCategories") },
    { value: doctors.length, label: t("hero.statSpecialists") },
  ];

  return (
    <div id="top">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 60% at 50% -10%, var(--brand-soft) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {t("hero.badge")}
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.15] tracking-tight text-fg sm:text-5xl">
              {t("hero.titleLead")}{" "}
              <span className="text-brand">{t("hero.titleAccent")}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              {t("hero.body")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
              >
                {t("hero.exploreCta")}
                <Icon name="arrow" size={16} className="rtl:rotate-180" />
              </a>
              <a
                href="#doctors"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg shadow-card transition-all hover:border-border-strong hover:shadow-card-hover"
              >
                {t("hero.teamCta")}
              </a>
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="eyebrow text-faint">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight text-fg">
                    {stat.value.toLocaleString(locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section id="categories" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow={t("categories.eyebrow")}
          title={t("categories.title")}
          description={t("categories.description")}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const count = services.filter(
              (s) => s.category.id === category.id,
            ).length;
            return (
              <a
                key={category.id}
                href="#services"
                className="group flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-card-hover"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                  <Icon name={categoryIcon(category.name_en)} size={22} />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-fg">
                  {pickRequired(category, "name", locale)}
                </h3>
                <span className="mt-3 text-xs font-medium text-faint">
                  {t("categories.count", { count })}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ---------------- Services ---------------- */}
      <section
        id="services"
        className="border-y border-border bg-surface-2/60 py-20"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow={t("services.eyebrow")}
            title={t("services.title")}
            description={t("services.description")}
          />

          {rate && (
            <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
              <Icon name="tag" size={14} className="shrink-0 text-brand" />
              {t("services.rateLabel")}{" "}
              <span className="font-semibold text-fg">
                <bdi>
                  {t("services.rateValue", {
                    rate: Number(rate.rate).toLocaleString("en-US"),
                  })}
                </bdi>
              </span>
            </p>
          )}

          <div className="mt-8">
            <ServicesExplorer
              services={services}
              categories={categories}
              concerns={concerns}
              doctors={doctors}
            />
          </div>
        </div>
      </section>

      {/* ---------------- Offers ---------------- */}
      {/* Below Services on purpose: an offer price only means something once
          the usual USD price and today's exchange rate, both established
          above, have been read. Nothing running today means no section at
          all, rather than a card apologising for the absence of a discount
          nobody was promised. */}
      {offers.length > 0 && (
        <section id="offers" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading
            eyebrow={t("offers.eyebrow")}
            title={t("offers.title")}
            description={t("offers.description")}
          />
          <OffersSection offers={offers} />
        </section>
      )}

      {/* ---------------- Doctors ---------------- */}
      <section id="doctors" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow={t("doctors.eyebrow")}
          title={t("doctors.title")}
          description={t("doctors.description")}
        />

        {/* Sits above the specialists rather than among them: she oversees
            the practice, and is not one of the bookable practitioners in the
            doctors table below. */}
        <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-muted shadow-card">
          <Icon name="shield" size={15} className="shrink-0 text-brand" />
          {t("doctors.managedBy")}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => {
            const name = pickRequired(doctor, "name", locale);
            const specialty = pick(doctor, "specialty", locale);
            const bio = pick(doctor, "bio", locale);
            return (
              <article
                key={doctor.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:border-border-strong hover:shadow-card-hover"
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-semibold tracking-wide text-brand">
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold tracking-tight text-fg">
                      {name}
                    </h3>
                  </div>
                </div>

                {specialty && (
                  <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                    <Icon name="user" size={13} className="text-brand" />
                    {specialty}
                  </span>
                )}

                {bio && (
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {bio}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------- Booking CTA ---------------- */}
      <section id="book" className="mx-auto max-w-6xl px-5 pb-4 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center shadow-card sm:p-14">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(80% 100% at 50% 0%, var(--brand-soft) 0%, transparent 75%)",
            }}
          />
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {t("booking.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
            {t("booking.description")}
          </p>
          <a
            href="tel:+963112345678"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover"
          >
            <Icon name="phone" size={16} />
            <bdi>+963 11 234 5678</bdi>
          </a>
        </div>
      </section>
    </div>
  );
}
