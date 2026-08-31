"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flagEmoji, listCountries } from "@/lib/phone";
import { Icon } from "./Icon";

/** Flag + calling-code trigger that opens a searchable country listbox, styled to match the booking form. */
export function CountrySelect({ value, onChange, locale, label, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const countries = useMemo(() => listCountries(locale), [locale]);
  const selected = countries.find((c) => c.code === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.callingCode.includes(q),
    );
  }, [countries, query]);

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeDropdown();
    }
    function onKeyDown(e) {
      if (e.key === "Escape") closeDropdown();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? closeDropdown() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-full items-center gap-1 rounded-s-lg border-e border-border px-3 py-2.5 text-sm text-fg outline-none transition-colors hover:bg-surface-2"
      >
        <span aria-hidden="true">{selected ? flagEmoji(selected.code) : ""}</span>
        <span>{selected ? `+${selected.callingCode}` : ""}</span>
        <Icon name="chevronDown" size={14} className="text-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute start-0 top-full z-10 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">—</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={c.code === value}
                  onClick={() => {
                    onChange(c.code);
                    closeDropdown();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors ${
                    c.code === value
                      ? "bg-brand-soft text-brand-strong"
                      : "text-fg hover:bg-surface-2"
                  }`}
                >
                  <span aria-hidden="true">{flagEmoji(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted">+{c.callingCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
