import type { Config } from "../config.ts";
import type {
  ChangeInventory,
  CommitStackItem,
  CommitStackPlan,
  RepositoryChange,
} from "../types/commit-stack.ts";
import {
  planFilePlacement,
  type FilePlacement,
} from "./commit-file-placement.ts";
import { requestStructuredObject } from "./openai-structured.ts";

const maxConsecutiveFailures = 2;
const maxCommits = 12;
const localFallbackRationale =
  "Commitron grouped these files locally after individual AI placement failed.";

export interface CommitStackPlanningOptions {
  onProgress?: (completed: number, total: number) => void;
  requestObject?: typeof requestStructuredObject;
}

/**
 * Assigns files one at a time and records each result locally. Individual model
 * failures fall back to deterministic grouping instead of discarding the plan.
 */
export async function planCommitStack(
  inventory: ChangeInventory,
  cfg: Config,
  options: CommitStackPlanningOptions = {},
): Promise<CommitStackPlan> {
  if (!inventory.files.length) return { commits: [], warnings: [] };
  if (cfg.mode === "demo") return demoPlan(inventory.files);

  const requestObject = options.requestObject ?? requestStructuredObject;
  const commits: CommitStackItem[] = [];
  let consecutiveFailures = 0;
  let fallbackCount = 0;
  let aiDisabled = false;

  for (const [index, file] of inventory.files.entries()) {
    if (aiDisabled) {
      addFileWithLocalFallback(commits, file);
      fallbackCount += 1;
    } else {
      try {
        const placement = await planFilePlacement(
          file,
          commits,
          inventory.branch,
          cfg,
          requestObject,
        );
        applyPlacement(commits, file, placement);
        consecutiveFailures = 0;
      } catch {
        addFileWithLocalFallback(commits, file);
        fallbackCount += 1;
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxConsecutiveFailures) aiDisabled = true;
      }
    }
    options.onProgress?.(index + 1, inventory.files.length);
  }

  assertCompletePlan(commits, inventory.files);
  return {
    commits,
    warnings: buildWarnings(inventory, fallbackCount, aiDisabled),
  };
}

function applyPlacement(
  commits: CommitStackItem[],
  file: RepositoryChange,
  placement: FilePlacement,
): void {
  if (placement.targetCommit >= 0) {
    const target = commits[placement.targetCommit];
    target.subject = placement.subject;
    target.body = placement.body;
    target.rationale = placement.rationale;
    addFileToCommit(target, file, placement.mixedReason);
    return;
  }

  commits.splice(placement.insertBefore, 0, {
    subject: placement.subject,
    body: placement.body,
    rationale: placement.rationale,
    files: [file.path],
    stagePaths: stagePathsFor(file),
    mixedFiles: placement.mixedReason
      ? [{ path: file.path, reason: placement.mixedReason }]
      : [],
  });
}

function addFileWithLocalFallback(
  commits: CommitStackItem[],
  file: RepositoryChange,
): void {
  const subject = fallbackSubject(file.path);
  const existing = commits.find(
    (commit) =>
      commit.rationale === localFallbackRationale &&
      commit.subject === subject,
  );
  if (existing) {
    addFileToCommit(existing, file, null);
    return;
  }

  if (commits.length < maxCommits) {
    commits.push({
      subject,
      body: `Include related changes under ${fallbackArea(file.path)}.`,
      rationale: localFallbackRationale,
      files: [file.path],
      stagePaths: stagePathsFor(file),
      mixedFiles: [],
    });
    return;
  }

  addFileToCommit(commits[commits.length - 1], file, null);
}

function addFileToCommit(
  commit: CommitStackItem,
  file: RepositoryChange,
  mixedReason: string | null,
): void {
  commit.files.push(file.path);
  commit.stagePaths = unique([
    ...(commit.stagePaths ?? commit.files),
    ...stagePathsFor(file),
  ]);
  if (mixedReason) {
    commit.mixedFiles.push({ path: file.path, reason: mixedReason });
  }
}

function stagePathsFor(file: RepositoryChange): string[] {
  return file.sourcePath ? [file.path, file.sourcePath] : [file.path];
}

function fallbackSubject(path: string): string {
  const area = fallbackArea(path);
  if (area === "documentation") return "docs: update documentation";
  if (area === "tests") return "test: update test coverage";
  if (area === "configuration") return "chore: update project configuration";
  if (area === "interface") return "feat: update terminal interface";
  if (area === "services") return "feat: update application services";
  return `chore: update ${area}`;
}

function fallbackArea(path: string): string {
  const normalized = path.toLowerCase();
  if (/\.(md|mdx|txt)$/.test(normalized) || normalized.startsWith("docs/")) {
    return "documentation";
  }
  if (
    /(^|\/)(__tests__|__smoke__|test|tests|spec)(\/|$)/.test(normalized) ||
    /\.(test|spec)\.[^.]+$/.test(normalized)
  ) {
    return "tests";
  }
  if (normalized.startsWith("src/components/")) return "interface";
  if (normalized.startsWith("src/services/")) return "services";
  if (
    /(^|\/)(package\.json|tsconfig\.json|bun\.lock|config)(\/|$|\.)/.test(
      normalized,
    )
  ) {
    return "configuration";
  }
  const topLevel = normalized.split("/")[0] || "project files";
  return topLevel.replace(/[^a-z0-9_-]+/g, " ").trim() || "project files";
}

function assertCompletePlan(
  commits: CommitStackItem[],
  files: RepositoryChange[],
): void {
  const plannedPaths = commits.flatMap((commit) => commit.files);
  const uniquePaths = new Set(plannedPaths);
  if (
    plannedPaths.length !== files.length ||
    uniquePaths.size !== files.length ||
    files.some((file) => !uniquePaths.has(file.path))
  ) {
    throw new Error("Commitron couldn't assign every repository path.");
  }
}

function buildWarnings(
  inventory: ChangeInventory,
  fallbackCount: number,
  aiDisabled: boolean,
): string[] {
  const warnings: string[] = [];
  if (fallbackCount) {
    warnings.push(
      `${fallbackCount} files used local fallback grouping; review those commit groups before execution.`,
    );
  }
  if (aiDisabled) {
    warnings.push(
      `OpenAI placement stopped after ${maxConsecutiveFailures} consecutive failures; remaining files were grouped locally.`,
    );
  }
  if (inventory.omittedFileCount) {
    warnings.push(
      `${inventory.omittedFileCount} additional files were omitted from commits and will remain in the working tree.`,
    );
  }
  const partiallyStaged = inventory.files.filter(
    (file) => file.staged && file.unstaged,
  );
  if (partiallyStaged.length) {
    warnings.push(
      `${partiallyStaged.length} files contain both staged and unstaged edits; whole-file commits will combine them.`,
    );
  }
  if (inventory.files.some((file) => file.truncated)) {
    warnings.push("Some large file excerpts were truncated during semantic analysis.");
  }
  return warnings;
}

function demoPlan(files: RepositoryChange[]): CommitStackPlan {
  return {
    commits: [
      {
        subject: "feat(auth): add OTP-based login flow",
        body: "Replace password verification with one-time-password authentication.",
        rationale: "The files form one cohesive authentication change.",
        files: files.map((file) => file.path),
        mixedFiles: [],
      },
    ],
    warnings: [],
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
