import { readFileSync } from "node:fs";

import { config as loadEnv } from "dotenv";

loadEnv();

async function main() {
  const file = process.argv.find((arg) => arg.endsWith(".csv"));
  if (!file) {
    console.error("usage: catalog:import file.csv [--create-missing]");
    process.exit(1);
  }

  const { parseCsv } = await import("../src/server/catalog/csv");
  const { importCatalogRows } = await import("../src/server/catalog/service");
  const { rowFromCsv } = await import("../src/server/catalog/schemas");
  type CatalogRow = ReturnType<typeof rowFromCsv>;

  const createMissing = process.argv.includes("--create-missing");
  const records = parseCsv(readFileSync(file, "utf8"));
  const rows: CatalogRow[] = [];
  const errors: { line: number; message: string }[] = [];

  records.forEach((record, index) => {
    try {
      rows.push(rowFromCsv(record));
    } catch (error) {
      errors.push({
        line: index + 2,
        message: error instanceof Error ? error.message : "invalid_row",
      });
    }
  });

  const report = await importCatalogRows(rows, createMissing);
  report.errors.unshift(...errors);
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "import failed");
  process.exit(1);
});
