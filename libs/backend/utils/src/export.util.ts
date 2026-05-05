import * as XLSX from "xlsx";

export type Row = (string | number | undefined | null)[];

/**
 * Builds a single-sheet XLSX workbook and returns it as a Buffer.
 * Column widths are auto-sized (max content length + 2).
 * Autofilter is applied to the full sheet range.
 */
export function toXlsx(sheetName: string, headers: string[], rows: Row[]): Buffer {
  const wb = XLSX.utils.book_new();
  const data = [[...headers], ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  const colWidths = headers.map((_, colIndex) =>
    data.reduce((max, row) => Math.max(max, `${row[colIndex] ?? ""}`.length + 2), 0)
  );
  ws["!cols"] = colWidths.map((width) => ({ width }));

  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws["!ref"] as string)),
  };

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Converts headers + rows to an RFC 4180-compliant CSV string.
 * - Separator: comma
 * - Line ending: CRLF
 * - Values containing comma, double-quote, or newline are wrapped in double-quotes
 * - Double-quotes inside values are escaped as ""
 * - null / undefined → empty string
 */
export function toCSV(headers: string[], rows: Row[]): string {
  const escape = (value: string | number | undefined | null): string => {
    const str = value === undefined || value === null ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return lines.join("\r\n");
}

