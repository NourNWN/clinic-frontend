/**
 * CSV export, aimed squarely at Excel.
 *
 * Two things matter for that and neither is obvious:
 *
 * The file starts with a UTF-8 byte order mark. Without it Excel reads a
 * .csv in the machine's legacy codepage, and every Arabic patient name opens
 * as mojibake — the single most common way an export like this "works" in
 * testing and fails on the receptionist's PC.
 *
 * And a cell that opens with = + - or @ is a formula to Excel, not text. A
 * phone number like +963900000000 would be evaluated, losing its +, and a
 * name someone typed starting with = is a way to run something on another
 * person's machine. Those cells get a leading apostrophe, which Excel and
 * Sheets both read as "this is text" and hide.
 */

const BOM = "﻿";
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

function escapeCell(value) {
  if (value === null || value === undefined) return "";

  let text = String(value);
  if (FORMULA_TRIGGERS.includes(text[0])) {
    text = `'${text}`;
  }
  // Quote whenever the value could otherwise break the row apart. Embedded
  // quotes are doubled, as the format requires.
  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    // CRLF: what Excel expects, and harmless everywhere else.
    .join("\r\n");
}

/**
 * Hands the browser a finished file. The object URL is revoked once the
 * click has been dispatched, so the blob doesn't sit in memory for the life
 * of the tab.
 */
export function downloadCsv(filename, headers, rows) {
  const blob = new Blob([BOM + toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
