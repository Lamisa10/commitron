export interface PlannedGitCommand {
  /** Arguments passed to `git` through execFile; the leading `git` is omitted. */
  args: string[];
}

export interface AskPlan {
  intent: string;
  destructive: boolean;
  explanation: string;
  commands: PlannedGitCommand[];
  warning?: string;
}
