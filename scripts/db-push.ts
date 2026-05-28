import "dotenv/config";

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith("file:")) {
  throw new Error("db:push currently expects a file: SQLite DATABASE_URL.");
}

const databasePath = resolve(databaseUrl.replace("file:", ""));

if (!existsSync(databasePath)) {
  writeFileSync(databasePath, "");
}

const diffOutput = execFileSync(
  "pnpm",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8" }
);

const sql = diffOutput.slice(diffOutput.indexOf("--")).trim();

if (sql && !sql.includes("empty migration")) {
  const result = spawnSync("sqlite3", [databasePath], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    throw new Error("sqlite3 failed to apply the Prisma schema diff.");
  }
}

execFileSync("pnpm", ["prisma", "generate"], { stdio: "inherit" });
