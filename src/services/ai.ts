import OpenAI from "openai";
import { commitCandidates } from "../data/mock.ts";
import type { Config } from "../config.ts";

export interface CommitCandidate {
  /** The commit subject line (e.g. "feat(auth): add OTP login"). */
  label: string;
  /** A one-sentence body explaining the change. */
  body: string;
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
