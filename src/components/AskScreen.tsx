import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking } from "./shared.tsx";
import { AskPlanView } from "./AskPlanView.tsx";
import {
  AskErrorView,
  AskModeNotice,
  type AskError,
} from "./AskFeedback.tsx";
import { GitPlanExecutionView } from "./GitPlanExecutionView.tsx";
import { loadConfig } from "../config.ts";
import { generateGitPlan } from "../services/ai.ts";
import { getRepositoryContext, isGitServiceError } from "../services/git.ts";
import { useGitPlanExecution } from "../hooks/useGitPlanExecution.ts";
import type { AskPlan } from "../types/git-plan.ts";
import { colors } from "../theme.ts";

type Stage = "input" | "thinking" | "review" | "result" | "error";

const demoDelayMs = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AskScreenProps {
  generatePlan?: typeof generateGitPlan;
}

/**
 * Turns plain-English intent into a Git plan. Demo mode simulates execution;
 * live mode uses real repository context and a local execution policy.
 */
export function AskScreen({ generatePlan = generateGitPlan }: AskScreenProps) {
  const cfg = useMemo(() => loadConfig(), []);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [plan, setPlan] = useState<AskPlan | null>(null);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<AskError | null>(null);
  const requestVersion = useRef(0);
  const execution = useGitPlanExecution(
    cfg.mode,
    plan?.commands ?? null,
    stage === "result",
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
    setQuery(request);
    setPlan(null);
    setError(null);
    setRan(false);
    execution.reset();
    setStage("thinking");

    try {
      let generatedPlan: AskPlan;
      if (cfg.mode === "demo") {
        [generatedPlan] = await Promise.all([
          generatePlan(request, null, cfg),
          sleep(demoDelayMs),
        ]);
      } else {
        const context = await getRepositoryContext(cfg.mode);
        generatedPlan = await generatePlan(request, context, cfg);
      }

      if (requestVersion.current !== currentRequest) return;
      setPlan(generatedPlan);
      setStage(
        cfg.mode === "demo" && generatedPlan.destructive ? "review" : "result",
      );
    } catch (caught) {
      if (requestVersion.current !== currentRequest) return;
      setError(friendlyAskError(caught));
      setStage("error");
    }
  }

  // Demo-only confirmation for the simulated execution flow.
  useInput((input, key) => {
    if (cfg.mode !== "demo" || stage !== "review") return;
    if (input.toLowerCase() === "y" || key.return) {
      setRan(true);
      setStage("result");
    } else if (input.toLowerCase() === "n") {
      setRan(false);
      setStage("result");
    }
  });

  const reset = () => {
    requestVersion.current += 1;
    setQuery("");
    setPlan(null);
    setRan(false);
    setError(null);
    execution.reset();
    setStage("input");
  };

  const canReset =
    stage === "error" ||
    (stage === "result" &&
      execution.status !== "running" &&
      execution.status !== "confirm");

  useInput(
    (input) => {
      if (canReset && input.toLowerCase() === "r") {
        reset();
      }
    },
    { isActive: canReset },
  );

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="✦"
        title="Ask"
        subtitle={
          cfg.mode === "live"
            ? "Describe what you want — Commitron prepares a repository-aware plan."
            : "Describe what you want — Commitron writes the Git."
        }
      />

      <AskModeNotice mode={cfg.mode} />

      {/* Prompt */}
      <Box>
        <Text color={colors.cyan}>{"ask ❯ "}</Text>
        {stage === "input" ? (
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={(value) => void submit(value)}
            placeholder='e.g. "undo my last commit but keep the changes"'
          />
        ) : (
          <Text color={colors.text}>{query}</Text>
        )}
      </Box>

      {stage === "thinking" && (
        <Box marginTop={1}>
          <Thinking label="Interpreting your request" />
        </Box>
      )}

      {stage === "error" && error && (
        <AskErrorView error={error} />
      )}

      {plan && (stage === "review" || stage === "result") && (
        <AskPlanView mode={cfg.mode} plan={plan} ran={ran} stage={stage} />
      )}

      {cfg.mode === "live" &&
      stage === "result" &&
      execution.policy ? (
        <GitPlanExecutionView
          error={execution.error}
          policy={execution.policy}
          results={execution.results}
          status={execution.status}
        />
      ) : null}
    </Box>
  );
}

function friendlyAskError(error: unknown): AskError {
  if (isGitServiceError(error, "NOT_REPOSITORY")) {
    return {
      kind: "repository",
      title: "Not a Git repository",
      message: "Commitron can't prepare a live plan in this folder.",
      nextStep: "Run `git init` or launch Commitron from an existing repository.",
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/401|api key|incorrect api/i.test(message)) {
    return {
      kind: "error",
      title: "OpenAI rejected the request",
      message: "Check the API key saved in Setup.",
    };
  }
  if (/ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return {
      kind: "error",
      title: "Couldn't reach OpenAI",
      message: "Check your network connection and try again.",
    };
  }

  return {
    kind: "error",
    title: "Couldn't prepare the plan",
    message:
      message.split("\n").find((line) => line.trim())?.trim().slice(0, 200) ||
      "An unknown error occurred.",
  };
}
