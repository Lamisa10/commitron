import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { loadConfig } from "../config.ts";
import { useGitPlanExecution } from "../hooks/useGitPlanExecution.ts";
import { sampleError } from "../data/mock.ts";
import { diagnoseGitError } from "../services/error-helper.ts";
import type { GitErrorDiagnosis } from "../types/live-features.ts";
import { colors } from "../theme.ts";
import { ErrorDiagnosisView } from "./ErrorDiagnosisView.tsx";
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

type Stage =
  | "command"
  | "error-input"
  | "thinking"
  | "result"
  | "failure";

const demoDelayMs = 1_500;
const maxCommandCharacters = 300;
const maxErrorCharacters = 8_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ErrorHelperScreenProps {
  diagnose?: typeof diagnoseGitError;
}

/** Decodes pasted Git failures and policy-checks every suggested recovery command. */
export function ErrorHelperScreen({
  diagnose = diagnoseGitError,
}: ErrorHelperScreenProps) {
  const cfg = useMemo(() => loadConfig(), []);
  const [stage, setStage] = useState<Stage>(
    cfg.mode === "demo" ? "thinking" : "command",
  );
  const [failedCommand, setFailedCommand] = useState(
    cfg.mode === "demo" ? sampleError.command : "",
  );
  const [errorOutput, setErrorOutput] = useState(
    cfg.mode === "demo" ? sampleError.raw.join(" ") : "",
  );
  const [diagnosis, setDiagnosis] = useState<GitErrorDiagnosis | null>(null);
  const [error, setError] = useState<FeatureError | null>(null);
  const requestVersion = useRef(0);
  const execution = useGitPlanExecution(
    cfg.mode,
    diagnosis?.commands.length ? diagnosis.commands : null,
    stage === "result",
  );

  useEffect(() => {
    if (cfg.mode !== "demo") return;
    const currentRequest = ++requestVersion.current;
    void (async () => {
      try {
        const [result] = await Promise.all([
          diagnose(failedCommand, errorOutput, cfg),
          sleep(demoDelayMs),
        ]);
        if (requestVersion.current !== currentRequest) return;
        setDiagnosis(result);
        setStage("result");
      } catch (caught) {
        if (requestVersion.current !== currentRequest) return;
        setError(friendlyDiagnosisError(caught));
        setStage("failure");
      }
    })();
    return () => {
      requestVersion.current += 1;
    };
  }, []);

  function submitCommand(value: string) {
    const command = value.trim();
    if (!command) return;
    setFailedCommand(command);
    setStage("error-input");
  }

  async function submitError(value: string) {
    const output = value.trim().slice(0, maxErrorCharacters);
    if (!output) return;

    const currentRequest = ++requestVersion.current;
    setErrorOutput(output);
    setDiagnosis(null);
    setError(null);
    execution.reset();
    setStage("thinking");

    try {
      const result = await diagnose(failedCommand, output, cfg);
      if (requestVersion.current !== currentRequest) return;
      setDiagnosis(result);
      setStage("result");
    } catch (caught) {
      if (requestVersion.current !== currentRequest) return;
      setError(friendlyDiagnosisError(caught));
      setStage("failure");
    }
  }

  function reset() {
    requestVersion.current += 1;
    execution.reset();
    setFailedCommand("");
    setErrorOutput("");
    setDiagnosis(null);
    setError(null);
    setStage(cfg.mode === "demo" ? "thinking" : "command");
  }

  const canReset =
    stage === "failure" ||
    (stage === "result" &&
      execution.status !== "running" &&
      execution.status !== "confirm");
  useInput(
    (input) => {
      if (canReset && input.toLowerCase() === "r") reset();
    },
    { isActive: canReset && cfg.mode === "live" },
  );

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⚠"
        title="Fix Error"
        subtitle="Paste a failed Git command and get a safe recovery plan."
      />

      <FeatureModeNotice
        mode={cfg.mode}
        liveText="Pasted text is sent to OpenAI; review it for secrets"
        demoText="Uses a predefined Git failure"
      />

      {stage === "command" ? (
        <Box>
          <Text color={colors.cyan}>{"command ❯ "}</Text>
          <TextInput
            value={failedCommand}
            onChange={(value) => setFailedCommand(value.slice(0, maxCommandCharacters))}
            onSubmit={submitCommand}
            placeholder="git push origin main"
          />
        </Box>
      ) : null}

      {stage === "error-input" ? (
        <Box flexDirection="column">
          <CommandLine cmd={failedCommand} color={colors.text} />
          <Box marginTop={1}>
            <Text color={colors.red}>{"error ❯ "}</Text>
            <TextInput
              value={errorOutput}
              onChange={(value) => setErrorOutput(value.slice(0, maxErrorCharacters))}
              onSubmit={(value) => void submitError(value)}
              placeholder="paste the most useful Git error text"
            />
          </Box>
          <Hint>Up to 8,000 characters; Enter analyzes the pasted text.</Hint>
        </Box>
      ) : null}

      {stage === "thinking" ? <Thinking label="Decoding the error" /> : null}

      {stage === "result" && diagnosis ? (
        <ErrorDiagnosisView
          command={failedCommand}
          diagnosis={diagnosis}
          errorOutput={errorOutput}
        />
      ) : null}

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

      {cfg.mode === "demo" && stage === "result" ? (
        <Hint>Esc to go back · no commands were run.</Hint>
      ) : null}

      {stage === "failure" && error ? <FeatureErrorView error={error} /> : null}
    </Box>
  );
}

function friendlyDiagnosisError(error: unknown): FeatureError {
  return friendlyModelError(error, "Couldn't diagnose the error");
}
