"use client";

import { usePathname } from "next/navigation";
import { BookingProvider } from "./BookingProvider";

/**
 * The admin panel is a separate surface — no public nav, footer, or booking
 * modal. `nav` and `footer` arrive pre-rendered from the (server) root
 * layout: Footer is an async Server Component, which a "use client" file
 * can't import and render directly, only accept as already-rendered output.
 */
export function SiteChrome({ nav, footer, children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <BookingProvider>
      {nav}
      <main className="flex-1">{children}</main>
      {footer}
    </BookingProvider>
  );
}
