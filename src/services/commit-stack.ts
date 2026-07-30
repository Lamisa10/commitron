import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { promisify } from "node:util";
import type { Mode } from "../config.ts";
import type {
  ChangeInventory,
  ChangeKind,
  CommitStackItem,
  CommitStackResult,
  RepositoryChange,
} from "../types/commit-stack.ts";
import { ensureGitRepository } from "./git.ts";

const run = promisify(execFile);
const maxInventoryFiles = 250;
const maxExcerptCharacters = 6_000;
const generatedPathPattern =
  /(^|\/)(node_modules|dist|build|coverage|\.next|vendor|target)(\/|$)|\.(min\.(js|css)|map)$/i;

interface StatusEntry {
  code: string;
  originalPath?: string;
  path: string;
}

/** Reads all repository changes without modifying the index or working tree. */
export async function getChangeInventory(mode: Mode): Promise<ChangeInventory> {
  if (mode === "demo") {
    return {
      branch: "demo",
      files: [],
      fingerprint: "demo",
      omittedFileCount: 0,
    };
  }

  await ensureGitRepository();
  const entries = await readStatusEntries();
  assertNoUnmergedEntries(entries);
  const includedEntries = entries.slice(0, maxInventoryFiles);
  const hasHead = await hasHeadCommit();
  const files: RepositoryChange[] = [];

  for (const entry of includedEntries) {
    files.push(await describeChange(entry, hasHead));
  }

  return {
    branch: await currentBranch(),
    files,
    fingerprint: await fingerprint(entries),
    omittedFileCount: Math.max(0, entries.length - includedEntries.length),
  };
}

/**
 * Reorganizes the index on the first call, stages one whole-file group, and
 * commits it. The working tree is never discarded.
 */
export async function executeCommitStackItem(
  item: CommitStackItem,
  expectedFingerprint: string,
  firstCommit: boolean,
  mode: Mode,
): Promise<CommitStackResult> {
  if (mode === "demo") {
    return {
      files: item.files,
      hash: "a3f9c1",
      subject: item.subject,
      summary: `${item.files.length} files changed`,
    };
  }

  await ensureGitRepository();
  if (firstCommit) {
    const entries = await readStatusEntries();
    const currentFingerprint = await fingerprint(entries);
    if (currentFingerprint !== expectedFingerprint) {
      throw new Error(
        "Repository changes moved after planning. Reopen Commit to build a fresh plan.",
      );
    }
    await clearIndex();
  } else {
    await assertIndexEmpty();
  }

  const stagePaths = item.stagePaths ?? item.files;
  await runGit(["add", "-A", "--", ...stagePaths]);
  const stagedPaths = await stagedFileNames();
  if (!stagedPaths.length) {
    throw new Error("This commit group no longer contains any stageable changes.");
  }
  const unexpectedPath = stagedPaths.find((path) => !stagePaths.includes(path));
  if (unexpectedPath) {
    throw new Error(`Git staged an unexpected path: ${unexpectedPath}`);
  }

  try {
    const { stdout } = await runGit([
      "commit",
      "-m",
      item.subject,
      "-m",
      item.body,
    ]);
    return {
      files: item.files,
      hash: /\[\S+\s+([0-9a-f]+)\]/.exec(stdout)?.[1] ?? "",
      subject: item.subject,
      summary:
        stdout.split("\n").find((line) => line.includes("changed"))?.trim() ??
        `${item.files.length} files committed`,
    };
  } catch (error) {
    throw new Error(
      `${conciseGitError(error)} The current group remains staged for inspection.`,
    );
  }
}

async function readStatusEntries(): Promise<StatusEntry[]> {
  const { stdout } = await runGit([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]);
  const records = stdout.split("\0").filter(Boolean);
  const entries: StatusEntry[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const code = record.slice(0, 2);
    const path = record.slice(3);
    const originalPath = /[RC]/.test(code) ? records[index + 1] : undefined;
    entries.push({ code, originalPath, path });
    if (originalPath) index += 1;
  }

  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function assertNoUnmergedEntries(entries: StatusEntry[]): void {
  const unmerged = entries.find(({ code }) =>
    /U|AA|DD/.test(code),
  );
  if (unmerged) {
    throw new Error(
      `Resolve merge conflicts before planning commits (${unmerged.path}).`,
    );
  }
}

async function describeChange(
  entry: StatusEntry,
  hasHead: boolean,
): Promise<RepositoryChange> {
  const untracked = entry.code === "??";
  const generated = generatedPathPattern.test(entry.path);
  const content = untracked
    ? await readUntrackedExcerpt(entry.path)
    : await readTrackedExcerpt(entry.path, hasHead);

  return {
    binary: content.binary,
    excerpt: generated ? "" : content.excerpt,
    generated,
    kind: changeKind(entry.code),
    path: entry.path,
    sourcePath: entry.originalPath,
    staged: !untracked && entry.code[0] !== " ",
    truncated: content.truncated,
    unstaged: untracked || entry.code[1] !== " ",
    untracked,
  };
}

async function readTrackedExcerpt(
  path: string,
  hasHead: boolean,
): Promise<{ binary: boolean; excerpt: string; truncated: boolean }> {
  try {
    const args = hasHead
      ? ["diff", "--no-ext-diff", "--no-textconv", "HEAD", "--", path]
      : ["diff", "--no-ext-diff", "--no-textconv", "--cached", "--", path];
    const { stdout } = await runGit(args, 8 * 1024 * 1024);
    const binary = /Binary files .* differ|GIT binary patch/.test(stdout);
    return {
      binary,
      excerpt: binary ? "" : stdout.slice(0, maxExcerptCharacters),
      truncated: stdout.length > maxExcerptCharacters,
    };
  } catch {
    return {
      binary: false,
      excerpt: "",
      truncated: true,
    };
  }
}

async function readUntrackedExcerpt(
  path: string,
): Promise<{ binary: boolean; excerpt: string; truncated: boolean }> {
  try {
    const file = await open(path, "r");
    try {
      const buffer = Buffer.alloc(maxExcerptCharacters + 1);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      const content = buffer.subarray(0, bytesRead);
      const binary = content.includes(0);
      return {
        binary,
        excerpt: binary
          ? ""
          : content.subarray(0, maxExcerptCharacters).toString("utf8"),
        truncated: bytesRead > maxExcerptCharacters,
      };
    } finally {
      await file.close();
    }
  } catch {
    return { binary: false, excerpt: "", truncated: true };
  }
}

function changeKind(code: string): ChangeKind {
  if (code === "??" || code.includes("A")) return "added";
  if (code.includes("D")) return "deleted";
  if (code.includes("R")) return "renamed";
  return "modified";
}

async function fingerprint(entries: StatusEntry[]): Promise<string> {
  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(`${entry.code}\0${entry.path}\0`);
    if (entry.originalPath) hash.update(`${entry.originalPath}\0`);
    if (!entry.code.includes("D")) {
      try {
        const { stdout } = await runGit([
          "hash-object",
          "--no-filters",
          "--",
          entry.path,
        ]);
        hash.update(stdout.trim());
      } catch {
        hash.update("unreadable");
      }
    }
  }
  return hash.digest("hex");
}

async function clearIndex(): Promise<void> {
  if (await hasHeadCommit()) {
    await runGit(["reset", "--mixed", "--quiet", "HEAD"]);
    return;
  }
  await runGit([
    "rm",
    "--cached",
    "-r",
    "--quiet",
    "--ignore-unmatch",
    "--",
    ".",
  ]);
}

async function assertIndexEmpty(): Promise<void> {
  try {
    await runGit(["diff", "--cached", "--quiet"]);
  } catch {
    throw new Error(
      "The index changed between commits. Stop and review `git status`.",
    );
  }
}

async function stagedFileNames(): Promise<string[]> {
  const { stdout } = await runGit([
    "diff",
    "--cached",
    "--name-only",
    "-z",
  ]);
  return stdout.split("\0").filter(Boolean);
}

async function currentBranch(): Promise<string> {
  const { stdout } = await runGit(["branch", "--show-current"]);
  return stdout.trim() || "(detached HEAD)";
}

async function hasHeadCommit(): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

async function runGit(
  args: string[],
  maxBuffer = 4 * 1024 * 1024,
): Promise<{ stdout: string; stderr: string }> {
  return run("git", args, {
    timeout: 30_000,
    maxBuffer,
    env: {
      ...process.env,
      GIT_PAGER: "cat",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
}

function conciseGitError(error: unknown): string {
  const output =
    error && typeof error === "object" && "stderr" in error
      ? String(error.stderr)
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    output.split("\n").find((line) => line.trim())?.trim().slice(0, 200) ||
    "Git couldn't create the commit."
  );
}
