import type { DiffLine } from "../data/mock.ts";
import type { PlannedGitCommand } from "./git-plan.ts";

export type DiffScope = "staged" | "unstaged" | "all";

export interface ExplainableDiff {
  lines: DiffLine[];
  raw: string;
  scope: DiffScope;
  truncated: boolean;
}

export interface DiffFileExplanation {
  path: string;
  explanation: string;
}

export interface DiffExplanation {
  overview: string;
  files: DiffFileExplanation[];
  riskLevel: "low" | "medium" | "high";
  riskExplanation: string;
}

export interface GitErrorDiagnosis {
  summary: string;
  cause: string;
  commands: PlannedGitCommand[];
  cautions: string[];
}
