"use client";

import { useState } from "react";

/**
 * A catalogue photo. The URL is free-form text a manager typed into the
 * admin, so two things follow: it can point anywhere (which rules out
 * next/image, whose host allowlist can't be known ahead of time), and it can
 * be wrong. A URL that fails to load removes the element rather than leaving
 * the browser's broken-image glyph in the middle of the page — every caller
 * is designed to read fine with no photo at all.
 */
export function Photo({ src, alt = "", className }) {
  // The URL that failed, not a boolean, so a different photo is retried
  // instead of inheriting the previous one's failure.
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || src === failedSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
