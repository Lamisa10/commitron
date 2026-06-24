import React, { useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, DiffView, Hint } from "./shared.tsx";
import { loadConfig } from "../config.ts";
import { getStagedDiff, commit, type StagedDiff, type CommitResult } from "../services/git.ts";
import { generateCommitMessages, type CommitCandidate } from "../services/ai.ts";
import { colors, border } from "../theme.ts";

type Status = "loading" | "empty" | "ready" | "committing" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads the staged diff and offers three Conventional-Commit candidates in a picker.
 * Demo mode uses mock data; live mode reads real git and calls OpenAI. The mode is
 * decided once by loadConfig() — the UI is identical either way.
 */
export function CommitScreen() {
  const cfg = useMemo(() => loadConfig(), []);
  const [diff, setDiff] = useState<StagedDiff | null>(null);
  const [candidates, setCandidates] = useState<CommitCandidate[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  // Read the diff and generate messages on mount (re-runs each time the screen opens).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const staged = await getStagedDiff(cfg.mode);
        if (cfg.mode === "demo") await sleep(1200); // keep the "thinking" feel
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
      } catch (e) {
        if (!cancelled) {
          setError(friendlyError(e));
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
    } catch (e) {
      setError(friendlyError(e));
      setStatus("error");
    }
  }

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="✎"
        title="Commit"
        subtitle="Conventional-Commit messages generated from your staged diff."
      />

      {cfg.requestedMode === "live" && !cfg.hasKey && (
        <Text color={colors.yellow}>⚠ No API key saved — open Setup to add one. Running in demo mode.</Text>
      )}

      {diff && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.dim}>Staged changes</Text>
          <DiffView lines={diff.lines.slice(0, 14)} />
          {diff.lines.length > 14 && <Hint>… {diff.lines.length - 14} more lines</Hint>}
        </Box>
      )}

      {status === "loading" && <Thinking label="Reading your changes" />}
      {status === "committing" && <Thinking label="Committing" />}

      {status === "empty" && (
        <Text color={colors.yellow}>Nothing staged. Run `git add` first, then try again.</Text>
      )}

      {status === "error" && (
        <Box flexDirection="column" borderStyle={border} borderColor={colors.red} paddingX={1}>
          <Text color={colors.red} bold>
            ✖ Something went wrong
          </Text>
          <Text color={colors.text}>{error}</Text>
        </Box>
      )}

      {status === "ready" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>Choose a message</Text>
          <SelectInput
            items={candidates.map((c, i) => ({ label: c.label, value: i }))}
            onSelect={(item) => choose(item.value as number)}
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
      )}

      {status === "done" && result && chosen !== null && (
        <Box flexDirection="column">
          <Box flexDirection="column" borderStyle={border} borderColor={colors.green} paddingX={1}>
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
      )}
    </Box>
  );
}

/** Turns raw git/OpenAI errors into a short, friendly line. */
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not a git repository/i.test(msg)) return "This folder isn't a Git repository.";
  if (/nothing to commit/i.test(msg)) return "Nothing to commit — your staged changes may be empty.";
  if (/401|api key|incorrect api/i.test(msg)) return "OpenAI rejected the request — check your API key.";
  if (/ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(msg)) return "Couldn't reach OpenAI — check your connection.";
  return msg;
}
