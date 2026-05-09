import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const lintablePattern = /\.(ts|tsx)$/;
const lintableRoots = ["src/", "supabase/functions/"];

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) return "";
  return result.stdout;
}

function lines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isLintable(file) {
  return lintablePattern.test(file)
    && lintableRoots.some((root) => file.startsWith(root))
    && existsSync(file);
}

const files = new Set([
  ...lines(git(["diff", "--name-only", "--diff-filter=ACMR", "HEAD", "--", "*.ts", "*.tsx"])),
  ...lines(git(["diff", "--name-only", "--diff-filter=ACMR", "--cached", "--", "*.ts", "*.tsx"])),
  ...lines(git(["ls-files", "--others", "--exclude-standard", "--", "*.ts", "*.tsx"])),
]);

const lintFiles = [...files].filter(isLintable);

if (lintFiles.length === 0) {
  console.log("No changed TypeScript files to lint.");
  process.exit(0);
}

const eslintBin = process.platform === "win32"
  ? "node_modules/.bin/eslint.cmd"
  : "node_modules/.bin/eslint";

const result = spawnSync(eslintBin, lintFiles, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
