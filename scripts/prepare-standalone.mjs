import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const standaloneDir = ".next/standalone";

mkdirSync(standaloneDir, { recursive: true });

const serverEntry = `const http = require("node:http");
const path = require("node:path");

const rootDir = path.join(__dirname, "..", "..");
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const next = require(path.join(rootDir, "node_modules", "next"));

const app = next({
  dev: false,
  dir: rootDir
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    console.log(\`> Ready on http://\${hostname}:\${port}\`);
  });
});
`;

writeFileSync(join(standaloneDir, "server.js"), serverEntry);

if (existsSync("public")) {
  cpSync("public", `${standaloneDir}/public`, { recursive: true });
}

if (existsSync(".next/static")) {
  mkdirSync(`${standaloneDir}/.next`, { recursive: true });
  cpSync(".next/static", `${standaloneDir}/.next/static`, { recursive: true });
}

if (existsSync(".next/server")) {
  mkdirSync(`${standaloneDir}/.next`, { recursive: true });
  cpSync(".next/server", `${standaloneDir}/.next/server`, { recursive: true });
}
