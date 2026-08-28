import { getTranslations } from "next-intl/server";
import { Icon } from "./Icon";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  const contact = [
    { icon: "phone", text: "+963 11 234 5678" },
    { icon: "mail", text: t("email") },
    { icon: "pin", text: t("address") },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-fg">
                <Icon name="sparkles" size={18} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-fg">
                {tNav("brand")}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t("about")}
            </p>
          </div>

          <div>
            <h2 className="eyebrow text-faint">{t("contact")}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {contact.map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-2.5 text-sm text-muted"
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    className="shrink-0 text-brand"
                  />
                  <bdi>{item.text}</bdi>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-faint">{t("hours")}</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-muted">
              <li className="flex justify-between gap-8">
                <span>{t("weekdays")}</span>
                <span className="font-medium text-fg">
                  <bdi>{t("weekdayHours")}</bdi>
                </span>
              </li>
              <li className="flex justify-between gap-8">
                <span>{t("friday")}</span>
                <span className="font-medium text-fg">{t("closed")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs text-faint">
          {/* Passed as a string so ICU doesn't group it as "2,026". */}
          {t("rights", { year: String(new Date().getFullYear()) })}
        </div>
      </div>
    </footer>
  );
}
