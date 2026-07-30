import type { PlannedGitCommand } from "../types/git-plan.ts";

const unsafeArgumentPattern = /[\0\r\n;&|`$<>]/;

export type PlanExecutionLevel = "read-only" | "confirm" | "manual";

export interface PlanExecutionPolicy {
  level: PlanExecutionLevel;
  reason: string;
}

/**
 * Classifies the entire plan by its riskiest command. Unknown and destructive
 * shapes are always manual-only.
 */
export function getPlanExecutionPolicy(
  commands: PlannedGitCommand[],
): PlanExecutionPolicy {
  if (commands.length === 0) {
    return manual("The plan doesn't contain a Git command.");
  }

  let policy: PlanExecutionPolicy = readOnly();

  for (const command of commands) {
    const commandPolicy = classifyCommand(command);
    if (commandPolicy.level === "manual") return commandPolicy;
    if (commandPolicy.level === "confirm") policy = commandPolicy;
  }

  return policy;
}

export function formatGitCommand(command: PlannedGitCommand): string {
  return ["git", ...command.args].map(quoteArgument).join(" ");
}

function classifyCommand(command: PlannedGitCommand): PlanExecutionPolicy {
  if (!isStructurallySafe(command)) {
    return manual("The command contains unsupported argument syntax.");
  }

  const [subcommand, ...args] = command.args;
  switch (subcommand) {
    case "status":
      return args.some((arg) => arg === "-z" || arg === "--null")
        ? manual("Null-delimited status output isn't supported in the TUI.")
        : readOnly();

    case "diff":
    case "log":
    case "show":
      return hasUnsafeReadOption(args)
        ? manual("This read command can access external data or write output.")
        : readOnly();

    case "branch":
      return isReadOnlyBranch(args)
        ? readOnly()
        : manual("Branch creation, movement, and deletion must be run manually.");

    case "remote":
      return args.length === 0 || (args.length === 1 && args[0] === "-v")
        ? readOnly()
        : manual("Only remote listing is available for in-app execution.");

    case "add":
      return isAllowedAdd(args)
        ? confirmed("This plan will change the staging area.")
        : manual("This `git add` shape isn't in Commitron's execution allowlist.");

    case "switch":
      return isAllowedSwitch(args)
        ? confirmed("This plan will change the checked-out branch.")
        : manual("This branch switch uses a risky or unsupported option.");

    case "checkout":
      return isAllowedCheckout(args)
        ? confirmed("This plan will change the checked-out branch.")
        : manual("File checkout and advanced checkout options must be run manually.");

    case "restore":
      return isAllowedRestoreStaged(args)
        ? confirmed("This plan will update the staging area.")
        : manual("Working-tree restore operations must be run manually.");

    case "stash":
      return isAllowedStashPush(args)
        ? confirmed("This plan will move changes into the Git stash.")
        : manual("Only non-interactive `git stash push` is available in-app.");

    case "reset":
    case "clean":
    case "push":
    case "pull":
    case "merge":
    case "rebase":
    case "cherry-pick":
    case "revert":
    case "rm":
      return manual("This command can discard work, rewrite history, or affect shared state.");

    default:
      return manual("This command isn't in Commitron's execution allowlist.");
  }
}

function readOnly(): PlanExecutionPolicy {
  return {
    level: "read-only",
    reason: "This plan only reads repository state.",
  };
}

function confirmed(reason: string): PlanExecutionPolicy {
  return { level: "confirm", reason };
}

function manual(reason: string): PlanExecutionPolicy {
  return { level: "manual", reason };
}

function isStructurallySafe(command: PlannedGitCommand): boolean {
  return (
    command.args.length > 0 &&
    command.args.length <= 20 &&
    command.args.every(
      (argument) =>
        typeof argument === "string" &&
        Boolean(argument) &&
        !unsafeArgumentPattern.test(argument),
    )
  );
}

function hasUnsafeReadOption(args: string[]): boolean {
  return args.some(
    (argument) =>
      argument === "--no-index" ||
      argument === "--ext-diff" ||
      argument === "--textconv" ||
      argument === "--binary" ||
      argument === "-z" ||
      argument === "--null" ||
      argument === "--output" ||
      argument.startsWith("--output="),
  );
}

function isReadOnlyBranch(args: string[]): boolean {
  if (args.length === 0) return true;
  const allowed = new Set(["--list", "-l", "--all", "-a", "--remotes", "-r", "-v", "-vv"]);
  return args.every((argument) => allowed.has(argument));
}

function isAllowedAdd(args: string[]): boolean {
  if (args.length === 0) return false;
  const blocked = new Set([
    "--patch",
    "-p",
    "--interactive",
    "-i",
    "--edit",
    "-e",
    "--renormalize",
  ]);
  return !args.some(
    (argument) =>
      blocked.has(argument) ||
      argument === "--chmod" ||
      argument.startsWith("--chmod="),
  );
}

function isAllowedSwitch(args: string[]): boolean {
  if (args.length === 1 && !args[0].startsWith("-")) return true;
  if (
    (args[0] === "-c" || args[0] === "--create") &&
    (args.length === 2 || args.length === 3)
  ) {
    return args.slice(1).every((argument) => !argument.startsWith("-"));
  }
  return false;
}

function isAllowedCheckout(args: string[]): boolean {
  if (args.length === 1 && !args[0].startsWith("-")) return true;
  if (
    (args[0] === "-b" || args[0] === "--branch") &&
    (args.length === 2 || args.length === 3)
  ) {
    return args.slice(1).every((argument) => !argument.startsWith("-"));
  }
  return false;
}

function isAllowedRestoreStaged(args: string[]): boolean {
  const hasStaged = args.includes("--staged") || args.includes("-S");
  const allowedOptions = new Set(["--staged", "-S", "--"]);
  return hasStaged && args.every(
    (argument) => !argument.startsWith("-") || allowedOptions.has(argument),
  );
}

function isAllowedStashPush(args: string[]): boolean {
  if (args.length === 0) return true;
  if (args[0] !== "push") return false;
  const blocked = new Set(["--all", "-a", "--patch", "-p"]);
  return !args.some((argument) => blocked.has(argument));
}

function quoteArgument(argument: string): string {
  if (/^[A-Za-z0-9._/@%+=:,~-]+$/.test(argument)) return argument;
  return `'${argument.replaceAll("'", "'\\''")}'`;
}
