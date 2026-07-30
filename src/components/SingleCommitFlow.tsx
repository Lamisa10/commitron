import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { Config } from "../config.ts";
import {
  commit,
  getStagedDiff,
  type CommitResult,
  type StagedDiff,
} from "../services/git.ts";
import {
  generateCommitMessages,
  type CommitCandidate,
} from "../services/ai.ts";
import { border, colors } from "../theme.ts";
import { DiffView, Hint, Thinking } from "./shared.tsx";
import { FeatureErrorView, type FeatureError } from "./FeatureErrorView.tsx";
import { friendlyModelError } from "./feature-errors.ts";

type Status = "loading" | "empty" | "ready" | "committing" | "done" | "error";

const demoDelayMs = 1_200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Preserves the deterministic one-commit presentation flow used in demo mode. */
export function SingleCommitFlow({ cfg }: { cfg: Config }) {
  const [diff, setDiff] = useState<StagedDiff | null>(null);
  const [candidates, setCandidates] = useState<CommitCandidate[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<FeatureError | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const staged = await getStagedDiff(cfg.mode);
        if (cfg.mode === "demo") await sleep(demoDelayMs);
        if (cancelled) return;
        if (!staged.raw.trim()) {
          setStatus("empty");
          return;
        }
        const messages = await generateCommitMessages(staged.raw, cfg);
        if (cancelled) return;
        setDiff(staged);
        setCandidates(messages);
        setStatus("ready");
      } catch (caught) {
        if (!cancelled) {
          setError(friendlyModelError(caught, "Couldn't prepare the commit"));
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(index: number) {
    setChosen(index);
    setStatus("committing");
    try {
      const committed = await commit(
        { subject: candidates[index].label, body: candidates[index].body },
        cfg.mode,
      );
      setResult(committed);
      setStatus("done");
    } catch (caught) {
      setError(friendlyModelError(caught, "Couldn't create the commit"));
      setStatus("error");
    }
  }

  return (
    <Box flexDirection="column">
      {diff ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.dim}>Staged changes</Text>
          <DiffView lines={diff.lines.slice(0, 14)} />
          {diff.lines.length > 14 ? (
            <Hint>… {diff.lines.length - 14} more lines</Hint>
          ) : null}
        </Box>
      ) : null}

      {status === "loading" ? <Thinking label="Reading your changes" /> : null}
      {status === "committing" ? <Thinking label="Committing" /> : null}
      {status === "empty" ? (
        <Text color={colors.yellow}>
          Nothing staged. Run `git add` first, then try again.
        </Text>
      ) : null}
      {status === "error" && error ? <FeatureErrorView error={error} /> : null}

      {status === "ready" ? (
        <Box flexDirection="column">
          <Text color={colors.dim}>Choose a message</Text>
          <SelectInput
            items={candidates.map((candidate, index) => ({
              label: candidate.label,
              value: index,
            }))}
            onSelect={(item) => void choose(item.value as number)}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? colors.cyan : colors.text} bold={isSelected}>
                {label}
              </Text>
            )}
          />
        </Box>
      ) : null}

      {status === "done" && result && chosen !== null ? (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle={border}
            borderColor={colors.green}
            paddingX={1}
          >
            <Text color={colors.green} bold>
              ✔ Committed
            </Text>
            <Text color={colors.text}>{candidates[chosen].label}</Text>
            <Text color={colors.dim}>{candidates[chosen].body}</Text>
          </Box>
          <Hint>
            {result.hash ? `[${result.hash}] ` : ""}
            {result.summary}
          </Hint>
        </Box>
      ) : null}
    </Box>
  );
}
