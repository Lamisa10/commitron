import {
  branchExamples,
  defaultBranchSuggestions,
} from "../data/mock.ts";
import type { Config } from "../config.ts";
import {
  getLocalBranchNames,
  isValidBranchName,
} from "./git.ts";
import { requestStructuredObject } from "./openai-structured.ts";

const conventionalBranchPattern =
  /^(feat|fix|docs|refactor|test|chore|perf|build|ci|style)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

const branchNamesSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    names: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["names"],
};

/** Produces three locally validated branch names that do not already exist. */
export async function suggestBranchNames(
  description: string,
  cfg: Config,
): Promise<string[]> {
  if (cfg.mode === "demo") return demoSuggestions(description);

  const existingNames = await getLocalBranchNames(cfg.mode);
  const response = await requestStructuredObject(cfg, {
    name: "branch_names",
    description: "Three conventional Git branch names.",
    schema: branchNamesSchema,
    system:
      "Generate exactly three concise conventional Git branch names. Use one of " +
      "feat/, fix/, docs/, refactor/, test/, chore/, perf/, build/, ci/, or style/. " +
      "The suffix must be lowercase kebab-case. Return names only through the schema.",
    user: JSON.stringify({ work: description }),
  });

  const names = readBranchNames(response);
  const uniqueNames = [...new Set(names)];
  const availableNames = uniqueNames.filter(
    (name) => !existingNames.includes(name),
  );
  const validity = await Promise.all(availableNames.map(isValidBranchName));
  const validNames = availableNames.filter((_, index) => validity[index]);

  if (validNames.length !== 3) {
    throw new Error(
      "The model couldn't produce three valid, unused branch names. Try a more specific description.",
    );
  }
  return validNames;
}

function demoSuggestions(description: string): string[] {
  const matchingExample = Object.entries(branchExamples).find(([example]) =>
    description.toLowerCase().includes(example.split(" ")[1] ?? ""),
  )?.[1];
  if (!matchingExample) return defaultBranchSuggestions;
  return [
    matchingExample,
    ...defaultBranchSuggestions.filter((name) => name !== matchingExample),
  ].slice(0, 3);
}

function readBranchNames(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    throw new Error("The model returned incomplete branch suggestions.");
  }
  const names = (value as { names?: unknown }).names;
  if (
    !Array.isArray(names) ||
    names.length !== 3 ||
    !names.every(
      (name) =>
        typeof name === "string" &&
        conventionalBranchPattern.test(name.trim()),
    )
  ) {
    throw new Error("The model returned invalid branch suggestions.");
  }
  return names.map((name) => name.trim());
}
