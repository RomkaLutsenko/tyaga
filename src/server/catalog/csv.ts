export type CsvRow = Record<string, string>;

const COLUMNS = [
  "sku_code",
  "category",
  "brand",
  "name",
  "description",
  "tags",
  "strength",
  "pack_or_volume",
  "nicotine_type",
  "active",
] as const;

function escapeCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: CsvRow[]) {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      COLUMNS.map((column) => escapeCell(row[column] ?? "")).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function parseCsv(text: string): CsvRow[] {
  const table = parseTable(text);
  if (table.length === 0) {
    return [];
  }
  const header = table[0] ?? [];
  return table
    .slice(1)
    .filter((line) => line.some((cell) => cell !== ""))
    .map((line) => {
      const row: CsvRow = {};
      header.forEach((column, index) => {
        row[column] = line[index] ?? "";
      });
      return row;
    });
}

function parseTable(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char ?? "";
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }
    cell += char ?? "";
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
