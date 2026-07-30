import OpenAI from "openai";
import { askExamples, commitCandidates } from "../data/mock.ts";
import type { Config } from "../config.ts";
import type { RepositoryContext } from "./git.ts";
import type { AskPlan, PlannedGitCommand } from "../types/git-plan.ts";
import { requestStructuredObject } from "./openai-structured.ts";

export interface CommitCandidate {
  /** The commit subject line (e.g. "feat(auth): add OTP login"). */
  label: string;
  /** A one-sentence body explaining the change. */
  body: string;
}

interface AskPlanResponse {
  intent: string;
  destructive: boolean;
  explanation: string;
  commands: PlannedGitCommand[];
  warning: string | null;
}

const askPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string" },
    destructive: { type: "boolean" },
    explanation: { type: "string" },
    commands: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          args: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: { type: "string" },
          },
        },
        required: ["args"],
      },
    },
    warning: { type: ["string", "null"] },
  },
  required: ["intent", "destructive", "explanation", "commands", "warning"],
} as const;

/**
 * Turns natural-language intent into a preview-only Git plan. Live mode uses
 * minimal repository context and strict structured output; nothing is executed.
 */
export async function generateGitPlan(
  request: string,
  context: RepositoryContext | null,
  cfg: Config,
): Promise<AskPlan> {
  if (cfg.mode === "demo") {
    return /status|change|what/i.test(request)
      ? askExamples.status
      : askExamples.default;
  }
  if (!context) throw new Error("Repository context is required in live mode.");

  const response = await requestStructuredObject(cfg, {
    name: "git_plan",
    description: "A safe, preview-only Git plan.",
    schema: askPlanSchema,
    system:
      "You are Commitron's Git planning engine. Convert the user's request into " +
      "a concise, preview-only Git plan tailored to the repository context. " +
      "Represent each command as an argv array that omits the leading `git`; for " +
      "example, `git status --short` becomes {\"args\":[\"status\",\"--short\"]}. " +
      "Never use shell operators, pipes, redirects, substitutions, scripts, package " +
      "managers, or non-Git commands. Never claim that a command ran. Mark destructive " +
      "true for plans that can rewrite history, discard changes, delete refs or files, " +
      "clean the working tree, or force push. When intent is ambiguous, choose the " +
      "safest read-only diagnostic plan and explain the ambiguity.",
    user: JSON.stringify({
      request,
      repository: context,
      note: "Status entries contain paths only. No diffs or file contents are included.",
    }),
  });
  return parseAskPlan(response);
}

/**
 * Produces commit-message candidates from a diff: the mock list in demo mode,
 * a real OpenAI completion in live mode.
 */
export async function generateCommitMessages(
  diff: string,
  cfg: Config,
): Promise<CommitCandidate[]> {
  if (cfg.mode === "demo") return commitCandidates;

  const client = new OpenAI({ apiKey: cfg.apiKey });
  const res = await client.chat.completions.create({
    model: cfg.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You write Git commit messages in the ${cfg.commitStyle} style. ` +
          `Given a staged diff, return exactly 3 candidates as JSON: ` +
          `{"candidates":[{"label":"<subject line>","body":"<one sentence>"}]}. ` +
          `Keep each label under 72 characters.`,
      },
      { role: "user", content: `Staged diff:\n\n${diff}` },
    ],
  });

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
    candidates?: CommitCandidate[];
  };
  if (!parsed.candidates?.length) {
    throw new Error("The model did not return any commit messages.");
  }
  return parsed.candidates.slice(0, 3);
}

function parseAskPlan(value: unknown): AskPlan {
  if (!isAskPlanResponse(value)) {
    throw new Error("The model returned an incomplete Git plan.");
  }

  const commands = value.commands.map((command) => ({
    args: command.args.map((argument) => argument.trim()),
  }));
  const hasUnsafeCommand = commands.some(
    (command) =>
      command.args.some(
        (argument) =>
          !argument ||
          /[\0\r\n;&|`$<>]/.test(argument),
      ),
  );
  if (hasUnsafeCommand) {
    throw new Error("The model returned a command that isn't safe to preview.");
  }

  return {
    intent: value.intent.trim(),
    destructive: value.destructive,
    explanation: value.explanation.trim(),
    commands,
    warning:
      value.warning?.trim() ||
      (value.destructive
        ? "This plan could change history or discard data. Review it carefully."
        : undefined),
  };
}

function isAskPlanResponse(value: unknown): value is AskPlanResponse {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<AskPlanResponse>;

  return (
    typeof plan.intent === "string" &&
    Boolean(plan.intent.trim()) &&
    typeof plan.destructive === "boolean" &&
    typeof plan.explanation === "string" &&
    Boolean(plan.explanation.trim()) &&
    Array.isArray(plan.commands) &&
    plan.commands.length > 0 &&
    plan.commands.length <= 5 &&
    plan.commands.every(
      (command) =>
        Boolean(command) &&
        typeof command === "object" &&
        Array.isArray(command.args) &&
        command.args.length > 0 &&
        command.args.length <= 20 &&
        command.args.every(
          (argument) => typeof argument === "string" && Boolean(argument.trim()),
        ),
    ) &&
    (typeof plan.warning === "string" || plan.warning === null)
  );
}
