import { cpSync, existsSync, mkdirSync } from "node:fs";

const standaloneDir = ".next/standalone";

if (!existsSync(standaloneDir)) {
  process.exit(0);
}

if (existsSync("public")) {
  cpSync("public", `${standaloneDir}/public`, { recursive: true });
}

if (existsSync(".next/static")) {
  mkdirSync(`${standaloneDir}/.next`, { recursive: true });
  cpSync(".next/static", `${standaloneDir}/.next/static`, { recursive: true });
}
