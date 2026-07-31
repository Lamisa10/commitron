import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import {
  prepareScenario,
  scenarioNames,
  scenarioNotes,
  type ScenarioName,
} from "./scenarios.ts";

const expectedMarker = "commitron-university-demo";

/** Restores the generated baseline, then prepares one real Git scenario. */
export function runDemoScenario(
  root: string,
  scenario: ScenarioName,
  announce = true,
): void {
  assertGeneratedRepository(root);
  resetGeneratedRepository(root);
  prepareScenario(root, scenario);

  if (!announce) return;
  console.log(`\nCommitron demo scenario ready: ${scenario}`);
  console.log(scenarioNotes[scenario]);
  printNextSteps();
}

/** Restores the clean baseline of a marker-verified generated repository. */
export function resetDemoRepository(root: string): void {
  assertGeneratedRepository(root);
  resetGeneratedRepository(root);
  console.log("\nCommitron demo repository restored to its clean baseline.");
  printNextSteps();
}

export function isDemoScenario(value: string): value is ScenarioName {
  return scenarioNames.includes(value as ScenarioName);
}

export function demoScenarioList(): string {
  return scenarioNames.join(", ");
}

function assertGeneratedRepository(root: string): void {
  const resolvedRoot = resolve(root);
  const markerPath = resolve(resolvedRoot, ".commitron-demo", "marker.json");
  let marker: { kind?: string } = {};
  try {
    marker = JSON.parse(readFileSync(markerPath, "utf8")) as { kind?: string };
  } catch {
    throw new Error(
      "Safety check failed: run this inside a generated Commitron demo repository.",
    );
  }
  if (marker.kind !== expectedMarker) {
    throw new Error(
      "Safety check failed: this is not a generated Commitron demo repository.",
    );
  }

  const gitRoot = realpathSync(
    gitOutput(resolvedRoot, ["rev-parse", "--show-toplevel"]).trim(),
  );
  if (gitRoot !== realpathSync(resolvedRoot)) {
    throw new Error(
      "Safety check failed: run this at the generated Git repository root.",
    );
  }
}

function resetGeneratedRepository(root: string): void {
  tryGit(root, ["rebase", "--abort"]);
  tryGit(root, ["merge", "--abort"]);
  tryGit(root, ["cherry-pick", "--abort"]);
  git(root, ["reset", "--hard"]);
  git(root, ["clean", "-fdx"]);
  git(root, ["checkout", "-B", "main", "demo/base"]);
  git(root, ["reset", "--hard", "demo/base"]);
  git(root, ["clean", "-fdx"]);
  tryGit(root, ["remote", "remove", "origin"]);

  const branches = gitOutput(root, [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
  ])
    .split("\n")
    .map((branch) => branch.trim())
    .filter((branch) => branch && branch !== "main");
  for (const branch of branches) git(root, ["branch", "-D", branch]);
}

function printNextSteps(): void {
  console.log("\nNext:");
  console.log("  commitron");
  console.log("\nSwitch scenarios with:");
  console.log("  commitron demo scenario <name>");
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, {
    cwd,
    stdio: "ignore",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function gitOutput(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function tryGit(cwd: string, args: string[]): void {
  try {
    git(cwd, args);
  } catch {
    // Abort/remove commands are expected to fail when that state is absent.
  }
}
