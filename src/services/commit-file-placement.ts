import type { Config } from "../config.ts";
import type {
  CommitStackItem,
  RepositoryChange,
} from "../types/commit-stack.ts";
import { requestStructuredObject } from "./openai-structured.ts";

export interface FilePlacement {
  body: string;
  insertBefore: number;
  mixedReason: string | null;
  rationale: string;
  subject: string;
  targetCommit: number;
}

const placementSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    targetCommit: { type: "integer", minimum: -1, maximum: 11 },
    insertBefore: { type: "integer", minimum: -1, maximum: 12 },
    subject: { type: "string" },
    body: { type: "string" },
    rationale: { type: "string" },
    mixedReason: { type: ["string", "null"] },
  },
  required: [
    "targetCommit",
    "insertBefore",
    "subject",
    "body",
    "rationale",
    "mixedReason",
  ],
};

/** Asks for one file placement, so model output never needs to repeat paths. */
export async function planFilePlacement(
  file: RepositoryChange,
  commits: CommitStackItem[],
  branch: string,
  cfg: Config,
  requestObject: typeof requestStructuredObject,
): Promise<FilePlacement> {
  const value = await requestObject(cfg, {
    name: "commit_file_placement",
    description: "Placement of one changed file into a meaningful commit stack.",
    schema: placementSchema,
    system:
      `Place one changed file into a small dependency-ordered stack of ${cfg.commitStyle} commits. ` +
      "If it belongs in an existing commit, return that zero-based targetCommit, set " +
      "insertBefore to -1, and revise the commit message to accurately cover the added file. " +
      "Otherwise set targetCommit to -1 and insertBefore to the new commit's position. " +
      "Keep closely coupled tests with their feature, foundations before consumers, and " +
      "documentation last. Prefer fewer coherent commits and never exceed 12. Subjects " +
      "must be under 72 characters. Explain mixed unrelated concerns in mixedReason.",
    user: JSON.stringify({
      branch,
      existingCommits: commits.map((commit, index) => ({
        index,
        subject: commit.subject,
        rationale: commit.rationale,
        fileCount: commit.files.length,
        recentFiles: commit.files.slice(-5),
      })),
      file,
    }),
  });

  return validatePlacement(value, commits.length);
}

function validatePlacement(
  value: unknown,
  existingCommitCount: number,
): FilePlacement {
  if (!value || typeof value !== "object") {
    throw new Error("The model returned an invalid file placement.");
  }
  const placement = value as Partial<FilePlacement>;
  const messagesAreValid =
    typeof placement.subject === "string" &&
    Boolean(placement.subject.trim()) &&
    placement.subject.trim().length <= 72 &&
    typeof placement.body === "string" &&
    Boolean(placement.body.trim()) &&
    typeof placement.rationale === "string" &&
    Boolean(placement.rationale.trim());
  if (
    !Number.isInteger(placement.targetCommit) ||
    !Number.isInteger(placement.insertBefore) ||
    !messagesAreValid ||
    !(
      typeof placement.mixedReason === "string" ||
      placement.mixedReason === null
    )
  ) {
    throw new Error("The model returned an invalid file placement.");
  }

  const targetCommit = placement.targetCommit as number;
  const insertBefore = placement.insertBefore as number;
  if (targetCommit === -1) {
    if (
      existingCommitCount >= 12 ||
      insertBefore < 0 ||
      insertBefore > existingCommitCount
    ) {
      throw new Error("The model returned an invalid new-commit position.");
    }
  } else if (
    targetCommit < 0 ||
    targetCommit >= existingCommitCount ||
    insertBefore !== -1
  ) {
    throw new Error("The model returned an invalid existing-commit target.");
  }

  return {
    targetCommit,
    insertBefore,
    subject: placement.subject!.trim(),
    body: placement.body!.trim(),
    rationale: placement.rationale!.trim(),
    mixedReason: placement.mixedReason?.trim() || null,
  };
}
