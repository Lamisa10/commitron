import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stagedDiff, type DiffLine } from "../data/mock.ts";
import type { Mode } from "../config.ts";

// execFile (not exec) avoids the shell, so arguments can't be misread as commands.
const run = promisify(execFile);

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

/** Reads the staged diff: mock data in demo mode, real `git diff --cached` in live mode. */
export async function getStagedDiff(mode: Mode): Promise<StagedDiff> {
  if (mode === "demo") {
    return { lines: stagedDiff, raw: stagedDiff.map((l) => l.text).join("\n") };
  }
  await assertGitRepository();
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
  await assertGitRepository();
  const { stdout } = await run("git", ["commit", "-m", message.subject, "-m", message.body]);
  return {
    // git prints e.g. "[main a3f9c1] subject\n 2 files changed, ...".
    hash: /\[\S+\s+([0-9a-f]+)\]/.exec(stdout)?.[1] ?? "",
    summary: stdout.split("\n").find((l) => l.includes("changed"))?.trim() ?? "",
  };
}

/** Checks repository state before running commands whose errors vary across Git versions. */
async function assertGitRepository(): Promise<void> {
  try {
    const { stdout } = await run("git", ["rev-parse", "--is-inside-work-tree"]);
    if (stdout.trim() !== "true") {
      throw new GitServiceError("NOT_REPOSITORY", "This folder isn't a Git working tree.");
    }
  } catch (error) {
    if (isGitServiceError(error)) throw error;

    const output =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr)
        : error instanceof Error
          ? error.message
          : String(error);

    if (/not a git repository/i.test(output)) {
      throw new GitServiceError("NOT_REPOSITORY", "This folder isn't a Git repository.");
    }
    throw error;
  }
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
