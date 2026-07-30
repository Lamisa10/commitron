import React, { useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { loadConfig } from "../config.ts";
import { explainDiff } from "../services/explain.ts";
import {
  getExplainableDiff,
  isGitServiceError,
} from "../services/git.ts";
import type {
  DiffExplanation,
  DiffScope,
  ExplainableDiff,
} from "../types/live-features.ts";
import { colors } from "../theme.ts";
import { DiffExplanationPanel } from "./DiffExplanationPanel.tsx";
import { FeatureErrorView, type FeatureError } from "./FeatureErrorView.tsx";
import { ScreenTitle } from "./Layout.tsx";
import {
  DiffView,
  FeatureModeNotice,
  Hint,
  Thinking,
} from "./shared.tsx";
import { friendlyModelError } from "./feature-errors.ts";

type Stage = "scope" | "loading" | "result" | "empty" | "error";

const scopeItems: Array<{ label: string; value: DiffScope }> = [
  { label: "All tracked changes", value: "all" },
  { label: "Staged changes", value: "staged" },
  { label: "Unstaged changes", value: "unstaged" },
];
const scopeLabels: Record<DiffScope, string> = {
  all: "All tracked changes",
  staged: "Staged changes",
  unstaged: "Unstaged changes",
};
const demoDelayMs = 1_200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ExplainScreenProps {
  loadDiff?: typeof getExplainableDiff;
  summarize?: typeof explainDiff;
}

/** Reads a selected diff scope and produces a bounded, structured explanation. */
export function ExplainScreen({
  loadDiff = getExplainableDiff,
  summarize = explainDiff,
}: ExplainScreenProps) {
  const cfg = useMemo(() => loadConfig(), []);
  const [stage, setStage] = useState<Stage>("scope");
  const [diff, setDiff] = useState<ExplainableDiff | null>(null);
  const [explanation, setExplanation] = useState<DiffExplanation | null>(null);
  const [error, setError] = useState<FeatureError | null>(null);
  const requestVersion = useRef(0);

  async function chooseScope(scope: DiffScope) {
    const currentRequest = ++requestVersion.current;
    setDiff(null);
    setExplanation(null);
    setError(null);
    setStage("loading");

    try {
      const loadedDiff = await loadDiff(scope, cfg.mode);
      if (requestVersion.current !== currentRequest) return;
      setDiff(loadedDiff);
      if (!loadedDiff.raw.trim()) {
        setStage("empty");
        return;
      }
      const [summary] = await Promise.all([
        summarize(loadedDiff, cfg),
        cfg.mode === "demo" ? sleep(demoDelayMs) : Promise.resolve(),
      ]);
      if (requestVersion.current !== currentRequest) return;
      setExplanation(summary);
      setStage("result");
    } catch (caught) {
      if (requestVersion.current !== currentRequest) return;
      setError(friendlyExplainError(caught));
      setStage("error");
    }
  }

  function reset() {
    requestVersion.current += 1;
    setDiff(null);
    setExplanation(null);
    setError(null);
    setStage("scope");
  }

  useInput(
    (input) => {
      if (input.toLowerCase() === "r") reset();
    },
    { isActive: stage === "result" || stage === "empty" || stage === "error" },
  );

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="❖"
        title="Explain"
        subtitle="A plain-English readout of what your diff actually does."
      />

      <FeatureModeNotice
        mode={cfg.mode}
        liveText="Selected tracked diff content is sent to OpenAI"
        demoText="Uses a mock diff and summary"
      />

      {stage === "scope" ? (
        <Box flexDirection="column">
          <Text color={colors.dim}>What should Commitron explain?</Text>
          <SelectInput
            items={scopeItems}
            onSelect={(item) => void chooseScope(item.value as DiffScope)}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? colors.cyan : colors.text} bold={isSelected}>
                {label}
              </Text>
            )}
          />
          <Hint>Untracked file contents are never included.</Hint>
        </Box>
      ) : null}

      {diff ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.dim}>{scopeLabels[diff.scope]}</Text>
          <DiffView lines={diff.lines.slice(0, 14)} />
          {diff.lines.length > 14 ? (
            <Hint>… {diff.lines.length - 14} more preview lines</Hint>
          ) : null}
          {diff.truncated ? (
            <Text color={colors.yellow}>
              Diff exceeded 50,000 characters; only the first portion was analyzed.
            </Text>
          ) : null}
        </Box>
      ) : null}

      {stage === "loading" ? <Thinking label="Reading and summarizing changes" /> : null}

      {stage === "empty" && diff ? (
        <Box flexDirection="column">
          <Text color={colors.yellow}>No {scopeLabels[diff.scope].toLowerCase()} found.</Text>
          <Hint>Press r to choose another scope.</Hint>
        </Box>
      ) : null}

      {stage === "result" && explanation ? (
        <DiffExplanationPanel explanation={explanation} />
      ) : null}

      {stage === "error" && error ? <FeatureErrorView error={error} /> : null}
    </Box>
  );
}

function friendlyExplainError(error: unknown): FeatureError {
  if (isGitServiceError(error, "NOT_REPOSITORY")) {
    return {
      kind: "repository",
      title: "Not a Git repository",
      message: "Commitron can't read changes in this folder.",
      nextStep: "Run `git init` or launch Commitron from an existing repository.",
    };
  }
  return friendlyModelError(error, "Couldn't explain the diff");
}
