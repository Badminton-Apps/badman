import * as XLSX from "xlsx";
import { Row, toCSV, toXlsx } from "./export.util";

describe("toXlsx", () => {
  const headers = ["Name", "Score", "Active"];
  const rows = [
    ["Alice", 42, true],
    ["Bob", null, undefined],
    ["C,D", '"quoted"', "line\nbreak"],
  ];

  let buffer: Buffer;

  beforeAll(() => {
    buffer = toXlsx("Results", headers, rows as Row[]);
  });

  it("returns a non-empty Buffer", () => {
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("produces a parseable workbook with the correct sheet name", () => {
    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toContain("Results");
  });

  it("writes the header row as the first row", () => {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets["Results"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(data[0]).toEqual(headers);
  });

  it("writes all data rows", () => {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets["Results"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(data).toHaveLength(rows.length + 1); // header + rows
  });

  it("sets autofilter on the sheet", () => {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets["Results"];
    expect(ws["!autofilter"]).toBeDefined();
  });
});

describe("toCSV", () => {
  it("produces comma-separated values", () => {
    const result = toCSV(["A", "B"], [["x", "y"]]);
    expect(result).toContain("x,y");
  });

  it("uses CRLF line endings", () => {
    const result = toCSV(["A"], [["1"], ["2"]]);
    expect(result).toContain("\r\n");
    expect(result.split("\r\n")).toHaveLength(3); // header + 2 rows
  });

  it("quotes values containing a comma", () => {
    const result = toCSV(["A"], [["hello,world"]]);
    expect(result).toContain('"hello,world"');
  });

  it("quotes values containing a double-quote and escapes it", () => {
    const result = toCSV(["A"], [['"quoted"']]);
    expect(result).toContain('"""quoted"""');
  });

  it("quotes values containing a newline", () => {
    const result = toCSV(["A"], [["line\nbreak"]]);
    expect(result).toContain('"line\nbreak"');
  });

  it("quotes values containing a carriage return", () => {
    const result = toCSV(["A"], [["line\rbreak"]]);
    expect(result).toContain('"line\rbreak"');
  });

  it("converts null to empty string", () => {
    const result = toCSV(["A", "B"], [[null, "x"]]);
    expect(result).toContain(",x");
  });

  it("converts undefined to empty string", () => {
    const result = toCSV(["A", "B"], [[undefined, "x"]]);
    expect(result).toContain(",x");
  });

  it("includes the header row as the first line", () => {
    const result = toCSV(["Col1", "Col2"], []);
    expect(result).toBe("Col1,Col2");
  });
});
