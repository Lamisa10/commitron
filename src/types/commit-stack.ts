import type { CommitResult } from "../services/git.ts";

export type ChangeKind = "added" | "modified" | "deleted" | "renamed";

export interface RepositoryChange {
  binary: boolean;
  excerpt: string;
  generated: boolean;
  kind: ChangeKind;
  path: string;
  sourcePath?: string;
  staged: boolean;
  truncated: boolean;
  unstaged: boolean;
  untracked: boolean;
}

export interface ChangeInventory {
  branch: string;
  files: RepositoryChange[];
  fingerprint: string;
  omittedFileCount: number;
}

export interface MixedFileWarning {
  path: string;
  reason: string;
}

export interface CommitStackItem {
  body: string;
  files: string[];
  mixedFiles: MixedFileWarning[];
  rationale: string;
  stagePaths?: string[];
  subject: string;
}

export interface CommitStackPlan {
  commits: CommitStackItem[];
  warnings: string[];
}

export interface CommitStackResult extends CommitResult {
  files: string[];
  subject: string;
}
