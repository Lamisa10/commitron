import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import Gradient from "ink-gradient";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { loadConfig } from "../config.ts";
import { useGitPlanExecution } from "../hooks/useGitPlanExecution.ts";
import { suggestBranchNames } from "../services/branch.ts";
import { isGitServiceError } from "../services/git.ts";
import type { PlannedGitCommand } from "../types/git-plan.ts";
import { colors, gradients } from "../theme.ts";
import { FeatureErrorView, type FeatureError } from "./FeatureErrorView.tsx";
import { GitPlanExecutionView } from "./GitPlanExecutionView.tsx";
import { ScreenTitle } from "./Layout.tsx";
import {
  CommandLine,
  FeatureModeNotice,
  Hint,
  Thinking,
} from "./shared.tsx";
import { friendlyModelError } from "./feature-errors.ts";

type Stage = "input" | "thinking" | "choose" | "plan" | "demo-done" | "error";

const demoDelayMs = 1_400;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BranchScreenProps {
  suggestNames?: typeof suggestBranchNames;
}

/** Generates validated branch names and creates the selected branch after confirmation. */
export function BranchScreen({
  suggestNames = suggestBranchNames,
}: BranchScreenProps) {
  const cfg = useMemo(() => loadConfig(), []);
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [error, setError] = useState<FeatureError | null>(null);
  const requestVersion = useRef(0);
  const commands: PlannedGitCommand[] | null = selectedName
    ? [{ args: ["switch", "-c", selectedName] }]
    : null;
  const execution = useGitPlanExecution(
    cfg.mode,
    commands,
    stage === "plan",
  );

  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );

  async function submit(value: string) {
    const request = value.trim();
    if (!request) return;

    const currentRequest = ++requestVersion.current;
    setDescription(request);
    setSuggestions([]);
    setSelectedName("");
    setError(null);
    execution.reset();
    setStage("thinking");

    try {
      const [names] = await Promise.all([
        suggestNames(request, cfg),
        cfg.mode === "demo" ? sleep(demoDelayMs) : Promise.resolve(),
      ]);
      if (requestVersion.current !== currentRequest) return;
      setSuggestions(names);
      setStage("choose");
    } catch (caught) {
      if (requestVersion.current !== currentRequest) return;
      setError(friendlyBranchError(caught));
      setStage("error");
    }
  }

  function chooseBranch(name: string) {
    setSelectedName(name);
    setStage(cfg.mode === "demo" ? "demo-done" : "plan");
  }

  function reset() {
    requestVersion.current += 1;
    execution.reset();
    setDescription("");
    setSuggestions([]);
    setSelectedName("");
    setError(null);
    setStage("input");
  }

  const canReset =
    stage === "error" ||
    stage === "demo-done" ||
    (stage === "plan" &&
      execution.status !== "running" &&
      execution.status !== "confirm");
  useInput(
    (input) => {
      if (canReset && input.toLowerCase() === "r") reset();
    },
    { isActive: canReset },
  );

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⌥"
        title="Branch"
        subtitle="Describe the work — get a clean, conventional branch name."
      />

      <FeatureModeNotice
        mode={cfg.mode}
        liveText="Description is sent to OpenAI; names are validated locally"
        demoText="Branch creation is simulated"
      />

      <Box>
        <Text color={colors.cyan}>{"branch ❯ "}</Text>
        {stage === "input" ? (
          <TextInput
            value={description}
            onChange={setDescription}
            onSubmit={(value) => void submit(value)}
            placeholder='e.g. "add login page with OTP"'
          />
        ) : (
          <Text color={colors.text}>{description}</Text>
        )}
      </Box>

      {stage === "thinking" ? (
        <Box marginTop={1}>
          <Thinking label="Naming your branch" />
        </Box>
      ) : null}

      {stage === "choose" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.dim}>Choose a validated name</Text>
          <SelectInput
            items={suggestions.map((name) => ({ label: name, value: name }))}
            onSelect={(item) => chooseBranch(String(item.value))}
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

      {selectedName && (stage === "plan" || stage === "demo-done") ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.dim}>Selected branch</Text>
          <Gradient colors={[...gradients.success]}>
            <Text bold>  {selectedName}</Text>
          </Gradient>
          <Box marginTop={1}>
            <CommandLine cmd={`git switch -c ${selectedName}`} color={colors.green} />
          </Box>
          {stage === "demo-done" ? (
            <>
              <Text color={colors.green}>✔ Demo complete — no branch was created.</Text>
              <Hint>Press r to name another branch.</Hint>
            </>
          ) : null}
        </Box>
      ) : null}

      {stage === "plan" && execution.policy ? (
        <GitPlanExecutionView
          error={execution.error}
          policy={execution.policy}
          results={execution.results}
          status={execution.status}
        />
      ) : null}

      {stage === "error" && error ? <FeatureErrorView error={error} /> : null}
    </Box>
  );
}

function friendlyBranchError(error: unknown): FeatureError {
  if (isGitServiceError(error, "NOT_REPOSITORY")) {
    return {
      kind: "repository",
      title: "Not a Git repository",
      message: "Commitron can't validate branch names in this folder.",
      nextStep: "Run `git init` or launch Commitron from an existing repository.",
    };
  }
  return friendlyModelError(error, "Couldn't generate branch names");
}
