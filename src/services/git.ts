import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stagedDiff, type DiffLine } from "../data/mock.ts";
import type { Mode } from "../config.ts";
import type {
  DiffScope,
  ExplainableDiff,
} from "../types/live-features.ts";

// execFile (not exec) avoids the shell, so arguments can't be misread as commands.
const run = promisify(execFile);
const maxExplainDiffCharacters = 50_000;

export interface StagedDiff {
  /** Parsed lines for colored display in <DiffView>. */
  lines: DiffLine[];
  /** Raw unified-diff text, sent to the model. */
  raw: string;
}

export interface CommitResult {
  hash: string;
  summary: string;
}

export interface RepositoryContext {
  branch: string;
  status: string[];
  recentCommits: string[];
}

export type GitServiceErrorCode = "NOT_REPOSITORY";

/** A stable service error that screens can present without parsing Git's wording. */
export class GitServiceError extends Error {
  constructor(
    public readonly code: GitServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GitServiceError";
  }
}

export function isGitServiceError(
  error: unknown,
  code?: GitServiceErrorCode,
): error is GitServiceError {
  return error instanceof GitServiceError && (!code || error.code === code);
}

/**
 * Reads the minimum repository context needed to interpret a natural-language
 * Git request. It intentionally excludes diffs and file contents.
 */
export async function getRepositoryContext(mode: Mode): Promise<RepositoryContext> {
  if (mode === "demo") {
    return {
      branch: "demo",
      status: [],
      recentCommits: [],
    };
  }

  await ensureGitRepository();
  const [branchResult, statusResult, recentCommits] = await Promise.all([
    run("git", ["branch", "--show-current"]),
    run("git", ["status", "--short"]),
    getRecentCommits(),
  ]);

  const status = splitLines(statusResult.stdout);
  const visibleStatus = status.slice(0, 40);
  if (status.length > visibleStatus.length) {
    visibleStatus.push(`… ${status.length - visibleStatus.length} more changed files`);
  }

  return {
    branch: branchResult.stdout.trim() || "(detached HEAD)",
    status: visibleStatus,
    recentCommits,
  };
}

/** Lists local branch names for collision checks without reading file contents. */
export async function getLocalBranchNames(mode: Mode): Promise<string[]> {
  if (mode === "demo") return [];
  await ensureGitRepository();
  const { stdout } = await run("git", [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
  ]);
  return splitLines(stdout);
}

/** Uses Git's own parser as the final branch-name validity check. */
export async function isValidBranchName(name: string): Promise<boolean> {
  try {
    await run("git", ["check-ref-format", "--branch", name]);
    return true;
  } catch {
    return false;
  }
}

/** Reads a bounded tracked-file diff for the requested Explain scope. */
export async function getExplainableDiff(
  scope: DiffScope,
  mode: Mode,
): Promise<ExplainableDiff> {
  if (mode === "demo") {
    return {
      lines: stagedDiff,
      raw: stagedDiff.map((line) => line.text).join("\n"),
      scope,
      truncated: false,
    };
  }

  await ensureGitRepository();
  const raw = await readDiffScope(scope);
  const truncated = raw.length > maxExplainDiffCharacters;
  const boundedRaw = raw.slice(0, maxExplainDiffCharacters);

  return {
    lines: parseDiff(boundedRaw),
    raw: boundedRaw,
    scope,
    truncated,
  };
}

/** Reads the staged diff: mock data in demo mode, real `git diff --cached` in live mode. */
export async function getStagedDiff(mode: Mode): Promise<StagedDiff> {
  if (mode === "demo") {
    return { lines: stagedDiff, raw: stagedDiff.map((l) => l.text).join("\n") };
  }
  await ensureGitRepository();
  const { stdout } = await run("git", ["diff", "--cached"]);
  return { lines: parseDiff(stdout), raw: stdout };
}

/** Commits the staged changes: a faked result in demo mode, a real commit in live mode. */
export async function commit(
  message: { subject: string; body: string },
  mode: Mode,
): Promise<CommitResult> {
  if (mode === "demo") {
    return { hash: "a3f9c1", summary: "2 files changed, 5 insertions(+), 1 deletion(-)" };
  }
  await ensureGitRepository();
  const { stdout } = await run("git", ["commit", "-m", message.subject, "-m", message.body]);
  return {
    // git prints e.g. "[main a3f9c1] subject\n 2 files changed, ...".
    hash: /\[\S+\s+([0-9a-f]+)\]/.exec(stdout)?.[1] ?? "",
    summary: stdout.split("\n").find((l) => l.includes("changed"))?.trim() ?? "",
  };
}

async function getRecentCommits(): Promise<string[]> {
  try {
    const { stdout } = await run("git", ["log", "-5", "--pretty=format:%h %s"]);
    return splitLines(stdout);
  } catch (error) {
    const output = getCommandErrorOutput(error);
    if (/does not have any commits|bad default revision/i.test(output)) return [];
    throw error;
  }
}

async function readDiffScope(scope: DiffScope): Promise<string> {
  const safeDiffOptions = ["--no-ext-diff", "--no-textconv"];
  if (scope === "staged") {
    return (await run("git", ["diff", ...safeDiffOptions, "--cached"])).stdout;
  }
  if (scope === "unstaged") {
    return (await run("git", ["diff", ...safeDiffOptions])).stdout;
  }

  if (await hasHeadCommit()) {
    return (await run("git", ["diff", ...safeDiffOptions, "HEAD"])).stdout;
  }

  const [staged, unstaged] = await Promise.all([
    run("git", ["diff", ...safeDiffOptions, "--cached"]),
    run("git", ["diff", ...safeDiffOptions]),
  ]);
  return [staged.stdout, unstaged.stdout].filter(Boolean).join("\n");
}

async function hasHeadCommit(): Promise<boolean> {
  try {
    await run("git", ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

/** Checks repository state before running commands whose errors vary across Git versions. */
export async function ensureGitRepository(): Promise<void> {
  try {
    const { stdout } = await run("git", ["rev-parse", "--is-inside-work-tree"]);
    if (stdout.trim() !== "true") {
      throw new GitServiceError("NOT_REPOSITORY", "This folder isn't a Git working tree.");
    }
  } catch (error) {
    if (isGitServiceError(error)) throw error;

    const output = getCommandErrorOutput(error);
    if (/not a git repository/i.test(output)) {
      throw new GitServiceError("NOT_REPOSITORY", "This folder isn't a Git repository.");
    }
    throw error;
  }
}

function getCommandErrorOutput(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    return String(error.stderr);
  }
  return error instanceof Error ? error.message : String(error);
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

/** Classifies each line of a unified diff so <DiffView> can color it. */
function parseDiff(raw: string): DiffLine[] {
  return raw.split("\n").map((text) => {
    if (/^(diff |index |--- |\+\+\+ |@@)/.test(text)) return { type: "meta", text };
    if (text.startsWith("+")) return { type: "add", text };
    if (text.startsWith("-")) return { type: "del", text };
    return { type: "ctx", text };
  });
}
