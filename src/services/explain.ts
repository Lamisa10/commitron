import { demoDiffExplanation } from "../data/mock.ts";
import type { Config } from "../config.ts";
import type {
  DiffExplanation,
  ExplainableDiff,
} from "../types/live-features.ts";
import { requestStructuredObject } from "./openai-structured.ts";

const diffExplanationSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["path", "explanation"],
      },
    },
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    riskExplanation: { type: "string" },
  },
  required: ["overview", "files", "riskLevel", "riskExplanation"],
};

/** Summarizes a bounded diff without executing any repository mutation. */
export async function explainDiff(
  diff: ExplainableDiff,
  cfg: Config,
): Promise<DiffExplanation> {
  if (cfg.mode === "demo") return demoDiffExplanation;

  const response = await requestStructuredObject(cfg, {
    name: "diff_explanation",
    description: "A plain-English explanation of a Git diff.",
    schema: diffExplanationSchema,
    system:
      "Explain the supplied Git diff for a developer who may be new to the codebase. " +
      "Describe only evidence visible in the diff. Keep file explanations concise. " +
      "Assess implementation risk as low, medium, or high and explain why.",
    user: JSON.stringify({
      scope: diff.scope,
      truncated: diff.truncated,
      diff: diff.raw,
    }),
  });

  return readDiffExplanation(response);
}

function readDiffExplanation(value: unknown): DiffExplanation {
  if (!value || typeof value !== "object") {
    throw new Error("The model returned an incomplete diff explanation.");
  }
  const result = value as Partial<DiffExplanation>;
  const validFiles =
    Array.isArray(result.files) &&
    result.files.length > 0 &&
    result.files.length <= 8 &&
    result.files.every(
      (file) =>
        file &&
        typeof file.path === "string" &&
        Boolean(file.path.trim()) &&
        typeof file.explanation === "string" &&
        Boolean(file.explanation.trim()),
    );

  if (
    typeof result.overview !== "string" ||
    !result.overview.trim() ||
    !validFiles ||
    !["low", "medium", "high"].includes(result.riskLevel ?? "") ||
    typeof result.riskExplanation !== "string" ||
    !result.riskExplanation.trim()
  ) {
    throw new Error("The model returned an incomplete diff explanation.");
  }

  return {
    overview: result.overview.trim(),
    files: result.files!,
    riskLevel: result.riskLevel!,
    riskExplanation: result.riskExplanation.trim(),
  };
}
