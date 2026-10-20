import {
  cpSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";

const pageFiles = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/catalog/page.tsx",
  "src/app/survey/page.tsx",
  "src/app/product/[id]/page.tsx",
];

const backup = ".pages-backup/api";
rmSync(".pages-backup", { recursive: true, force: true });
mkdirSync(".pages-backup", { recursive: true });
cpSync("src/app/api", backup, { recursive: true });
rmSync("src/app/api", { recursive: true, force: true });
renameSync("src/app/robots.ts", ".pages-backup/robots.ts");
mkdirSync(".pages-backup/pages", { recursive: true });

for (const file of pageFiles) {
  const source = readFileSync(file, "utf8");
  writeFileSync(`.pages-backup/pages/${file.replaceAll("/", "__")}`, source);
  writeFileSync(
    file,
    source.replace(/\r?\nexport const instant = false;\r?\n/, "\n"),
  );
}

rmSync(".next", { recursive: true, force: true });

try {
  execSync("npx next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "1",
      NEXT_PUBLIC_STATIC: "1",
    },
  });
} finally {
  cpSync(backup, "src/app/api", { recursive: true });
  renameSync(".pages-backup/robots.ts", "src/app/robots.ts");
  for (const file of pageFiles) {
    writeFileSync(
      file,
      readFileSync(`.pages-backup/pages/${file.replaceAll("/", "__")}`, "utf8"),
    );
  }
  rmSync(".pages-backup", { recursive: true, force: true });
}
