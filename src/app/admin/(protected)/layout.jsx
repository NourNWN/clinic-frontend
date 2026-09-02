"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSession } from "@/lib/adminAuth";

/**
 * Guards every route under /admin except /admin/login (which lives outside
 * this route group). A basic client-side check on mount — good enough for
 * now; middleware/proxy-based protection can come later if needed.
 */
export default function ProtectedAdminLayout({ children }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    // localStorage isn't available during SSR, so this can only run after
    // mount — the deliberate reason `ready` is effect-driven rather than
    // derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center px-5">
        <p className="text-sm text-muted">{t("loading")}</p>
      </div>
    );
  }

  return children;
}
