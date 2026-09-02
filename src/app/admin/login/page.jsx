"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { adminLogin, getSession } from "@/lib/adminAuth";
import { pickRequired } from "@/lib/localized";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function AdminLoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.login");
  const tNav = useTranslations("nav");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Already signed in? Skip the form entirely.
  useEffect(() => {
    if (getSession()) router.replace("/admin");
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLogin(username, password);
      router.push("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.code) {
        setError(pickRequired(err, "message", locale));
      } else {
        setError(t("genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-hd.png"
            alt={tNav("logoAlt")}
            width={4392}
            height={2040}
            priority
            className="h-9 w-auto shrink-0"
          />
          <span className="text-[15px] font-semibold tracking-tight text-fg">
            {tNav("brand")}
          </span>
        </Link>
        <LocaleSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("subtitle")}</p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-7 flex flex-col gap-5"
          >
            {error && (
              <p className="rounded-lg border border-border bg-accent-soft px-3 py-2 text-sm text-accent">
                {error}
              </p>
            )}

            <div>
              <label
                htmlFor="admin-username"
                className="text-sm font-medium text-fg"
              >
                {t("usernameLabel")}
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="text-sm font-medium text-fg"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg shadow-card transition-all hover:bg-brand-strong hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
