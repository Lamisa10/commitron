import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, parse, resolve } from "node:path";
import { createDemoProjectFiles } from "./demo-repo/project-files.ts";

const sourceRoot = resolve(import.meta.dir, "..");
const targetArgument = Bun.argv[2];

if (!targetArgument) {
  throw new Error(
    "Choose a new demo directory, for example: bun run demo:prepare -- ../commitron-university-demo",
  );
}

const target = resolve(targetArgument);
validateTarget(target);
const targetParent = dirname(target);
mkdirSync(targetParent, { recursive: true });
const staging = mkdtempSync(join(targetParent, ".commitron-demo-building-"));

try {
  writeProject(staging);
  initializeRepository(staging);
  prepareInitialScenario(staging);

  if (existsSync(target)) rmdirSync(target);
  renameSync(staging, target);
} catch (error) {
  rmSync(staging, { recursive: true, force: true });
  throw error;
}

console.log("\nReal Commitron demo repository created:");
console.log(`  ${target}`);
console.log("\nThe Ask scenario is ready. Start the presentation with:");
console.log(`  cd ${shellQuote(target)}`);
console.log("  commitron");
console.log("\nSee DEMO_GUIDE.md for the complete scenario order.");

function validateTarget(path: string): void {
  const filesystemRoot = parse(path).root;
  if (path === filesystemRoot || path === homedir() || path === sourceRoot) {
    throw new Error("Refusing to use a broad or protected directory as the demo target.");
  }
  if (!existsSync(path)) return;
  if (!lstatSync(path).isDirectory() || readdirSync(path).length > 0) {
    throw new Error("The demo target must be a new or completely empty directory.");
  }
}

function writeProject(root: string): void {
  for (const [relativePath, contents] of Object.entries(createDemoProjectFiles())) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
  copyFileSync(
    join(import.meta.dir, "demo-repo", "scenario-runner.ts"),
    join(root, ".commitron-demo", "scenario-runner.ts"),
  );
  copyFileSync(
    join(import.meta.dir, "demo-repo", "scenarios.ts"),
    join(root, ".commitron-demo", "scenarios.ts"),
  );
}

function initializeRepository(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(root, ["config", "user.name", "Commitron Demo"]);
  git(root, ["config", "user.email", "demo@commitron.local"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "chore: create OTP Store baseline"]);
  git(root, ["tag", "demo/base"]);
}

function prepareInitialScenario(root: string): void {
  execFileSync(process.execPath, [
    "run",
    join(root, ".commitron-demo", "scenario-runner.ts"),
    "ask",
  ], {
    cwd: root,
    stdio: "ignore",
  });
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, {
    cwd,
    stdio: "ignore",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
