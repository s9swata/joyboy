#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn("npx", ["tsx", "src/index.tsx"], {
  cwd: projectRoot,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
