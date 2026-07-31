import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { demoGuides } from "./guides.ts";
import { createDemoProjectFiles } from "./project-files.ts";
import { runDemoScenario } from "./repository.ts";

/** Creates a safe disposable Git repository and leaves the Ask scenario ready. */
export function prepareDemoRepository(targetArgument: string): string {
  const target = resolve(targetArgument);
  const targetAlreadyExists = existsSync(target);
  validateTarget(target);

  const targetParent = dirname(target);
  mkdirSync(targetParent, { recursive: true });
  const staging = mkdtempSync(join(targetParent, ".commitron-demo-building-"));

  try {
    writeProject(staging);
    initializeRepository(staging);
    runDemoScenario(staging, "ask", false);

    if (targetAlreadyExists) {
      cpSync(staging, target, { recursive: true });
      rmSync(staging, { recursive: true, force: true });
    } else {
      renameSync(staging, target);
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  console.log("\nReal Commitron demo repository created:");
  console.log(`  ${target}`);
  console.log("\nThe Ask scenario is ready. Start with:");
  console.log(`  cd ${shellQuote(target)}`);
  console.log("  commitron");
  console.log("\nOpen DEMO_CHEATSHEET.md during the presentation.");
  return target;
}

function validateTarget(path: string): void {
  const filesystemRoot = parse(path).root;
  if (
    path === filesystemRoot ||
    path === homedir() ||
    path === resolve(process.cwd())
  ) {
    throw new Error(
      "Refusing to use the current, home, or filesystem-root directory.",
    );
  }
  if (!existsSync(path)) return;
  if (!lstatSync(path).isDirectory() || readdirSync(path).length > 0) {
    throw new Error("The demo target must be a new or completely empty directory.");
  }
}

function writeProject(root: string): void {
  const files = {
    ...createDemoProjectFiles(),
    ...demoGuides,
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
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
