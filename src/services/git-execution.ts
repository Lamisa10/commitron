import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureGitRepository } from "./git.ts";
import { getPlanExecutionPolicy } from "./git-policy.ts";
import type { PlannedGitCommand } from "../types/git-plan.ts";

const run = promisify(execFile);
const maxOutputLines = 60;

export interface GitCommandResult {
  command: PlannedGitCommand;
  output: string[];
  truncated: boolean;
}

export class GitPlanExecutionError extends Error {
  constructor(
    message: string,
    public readonly command: PlannedGitCommand,
    public readonly completedResults: GitCommandResult[],
  ) {
    super(message);
    this.name = "GitPlanExecutionError";
  }
}

/**
 * Executes a previously classified plan without a shell. The policy is checked
 * again here so UI state can never bypass the allowlist.
 */
export async function executeGitPlan(
  commands: PlannedGitCommand[],
  allowMutation: boolean,
): Promise<GitCommandResult[]> {
  const policy = getPlanExecutionPolicy(commands);
  if (policy.level === "manual") {
    throw new Error(`Commitron won't execute this plan: ${policy.reason}`);
  }
  if (policy.level === "confirm" && !allowMutation) {
    throw new Error("This plan requires explicit confirmation.");
  }

  await ensureGitRepository();
  const results: GitCommandResult[] = [];

  for (const command of commands) {
    try {
      const args = [
        "-c",
        `core.hooksPath=${process.platform === "win32" ? "NUL" : "/dev/null"}`,
        "-c",
        "core.fsmonitor=false",
        ...hardenReadOnlyCommand(command),
      ];
      const { stdout, stderr } = await run("git", args, {
        timeout: 15_000,
        maxBuffer: 512 * 1024,
        env: {
          ...process.env,
          GIT_PAGER: "cat",
          GIT_TERMINAL_PROMPT: "0",
        },
      });
      results.push(toCommandResult(command, `${stdout}${stderr}`));
    } catch (error) {
      throw new GitPlanExecutionError(
        conciseCommandError(error),
        command,
        results,
      );
    }
  }

  return results;
}

function hardenReadOnlyCommand(command: PlannedGitCommand): string[] {
  const [subcommand, ...args] = command.args;
  if (subcommand === "diff" || subcommand === "log" || subcommand === "show") {
    return [subcommand, "--no-ext-diff", "--no-textconv", ...args];
  }
  return command.args;
}

function toCommandResult(
  command: PlannedGitCommand,
  rawOutput: string,
): GitCommandResult {
  const lines = rawOutput
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const output = lines.slice(0, maxOutputLines);
  const truncated = lines.length > output.length;

  return {
    command,
    output: output.length ? output : ["Command completed successfully."],
    truncated,
  };
}

function conciseCommandError(error: unknown): string {
  const output =
    error && typeof error === "object" && "stderr" in error
      ? String(error.stderr)
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    output.split("\n").find((line) => line.trim())?.trim().slice(0, 200) ||
    "Git couldn't execute the command."
  );
}
