import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import {
  prepareScenario,
  scenarioNames,
  scenarioNotes,
  type ScenarioName,
} from "./scenarios.ts";

const expectedMarker = "commitron-university-demo";
const repositoryRoot = resolve(import.meta.dir, "..");
const requestedScenario = Bun.argv[2] ?? "";

assertGeneratedRepository(repositoryRoot);

if (requestedScenario === "reset") {
  resetGeneratedRepository(repositoryRoot);
  printReady("reset", "Clean baseline restored.");
} else if (isScenarioName(requestedScenario)) {
  resetGeneratedRepository(repositoryRoot);
  prepareScenario(repositoryRoot, requestedScenario);
  printReady(requestedScenario, scenarioNotes[requestedScenario]);
} else {
  console.error(`Choose a scenario: ${scenarioNames.join(", ")}, or reset.`);
  process.exit(1);
}

function assertGeneratedRepository(root: string): void {
  const markerPath = resolve(root, ".commitron-demo", "marker.json");
  let marker: { kind?: string } = {};
  try {
    marker = JSON.parse(readFileSync(markerPath, "utf8")) as { kind?: string };
  } catch {
    throw new Error("Safety check failed: Commitron demo marker is missing or invalid.");
  }
  if (marker.kind !== expectedMarker) {
    throw new Error("Safety check failed: this is not a generated Commitron demo repository.");
  }

  const gitRoot = realpathSync(gitOutput(root, ["rev-parse", "--show-toplevel"]).trim());
  if (gitRoot !== realpathSync(root)) {
    throw new Error("Safety check failed: the controller is not at the Git repository root.");
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

function isScenarioName(value: string): value is ScenarioName {
  return scenarioNames.includes(value as ScenarioName);
}

function printReady(name: string, note: string): void {
  console.log(`\nCommitron demo scenario ready: ${name}`);
  console.log(note);
  console.log("\nNext:");
  console.log("  commitron");
  console.log("\nRestore or switch scenarios with:");
  console.log("  bun run demo:scenario <name>");
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
    // An abort/remove command is expected to fail when that state is absent.
  }
}
