import { demoErrorDiagnosis } from "../data/mock.ts";
import type { Config } from "../config.ts";
import type { GitErrorDiagnosis } from "../types/live-features.ts";
import type { PlannedGitCommand } from "../types/git-plan.ts";
import { requestStructuredObject } from "./openai-structured.ts";

const unsafeArgumentPattern = /[\0\r\n;&|`$<>]/;

const diagnosisSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    cause: { type: "string" },
    commands: {
      type: "array",
      minItems: 0,
      maxItems: 4,
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
    cautions: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: { type: "string" },
    },
  },
  required: ["summary", "cause", "commands", "cautions"],
};

/** Converts pasted Git failure text into advice and policy-checkable Git commands. */
export async function diagnoseGitError(
  command: string,
  errorOutput: string,
  cfg: Config,
): Promise<GitErrorDiagnosis> {
  if (cfg.mode === "demo") return demoErrorDiagnosis;

  const response = await requestStructuredObject(cfg, {
    name: "git_error_diagnosis",
    description: "A friendly Git error diagnosis and recovery plan.",
    schema: diagnosisSchema,
    system:
      "Explain the Git failure in beginner-friendly language and suggest the smallest " +
      "recovery plan. Commands must be Git commands represented as argv arrays without " +
      "the leading `git`. Never use shell syntax or non-Git commands. Do not claim that " +
      "a command ran. Put risks or prerequisites in cautions.",
    user: JSON.stringify({
      failedCommand: command,
      errorOutput,
    }),
  });

  return readDiagnosis(response);
}

function readDiagnosis(value: unknown): GitErrorDiagnosis {
  if (!value || typeof value !== "object") {
    throw new Error("The model returned an incomplete error diagnosis.");
  }
  const result = value as Partial<GitErrorDiagnosis>;
  const commands = Array.isArray(result.commands) ? result.commands : null;
  const cautions = Array.isArray(result.cautions) ? result.cautions : null;

  if (
    typeof result.summary !== "string" ||
    !result.summary.trim() ||
    typeof result.cause !== "string" ||
    !result.cause.trim() ||
    !commands ||
    commands.length > 4 ||
    !commands.every(isSafeCommand) ||
    !cautions ||
    cautions.length > 4 ||
    !cautions.every(
      (caution) => typeof caution === "string" && Boolean(caution.trim()),
    )
  ) {
    throw new Error("The model returned an incomplete error diagnosis.");
  }

  return {
    summary: result.summary.trim(),
    cause: result.cause.trim(),
    commands,
    cautions: cautions.map((caution) => caution.trim()),
  };
}

function isSafeCommand(command: PlannedGitCommand): boolean {
  return (
    command &&
    Array.isArray(command.args) &&
    command.args.length > 0 &&
    command.args.length <= 20 &&
    command.args.every(
      (argument) =>
        typeof argument === "string" &&
        Boolean(argument.trim()) &&
        !unsafeArgumentPattern.test(argument),
    )
  );
}
