import { useEffect, useRef, useState } from "react";
import { useInput } from "ink";
import type { Mode } from "../config.ts";
import {
  executeGitPlan,
  GitPlanExecutionError,
  type GitCommandResult,
} from "../services/git-execution.ts";
import {
  getPlanExecutionPolicy,
  type PlanExecutionPolicy,
} from "../services/git-policy.ts";
import type { PlannedGitCommand } from "../types/git-plan.ts";

export type ExecutionStatus = "idle" | "confirm" | "running" | "done" | "error";

interface GitPlanExecutionState {
  error: string;
  policy: PlanExecutionPolicy | null;
  reset: () => void;
  results: GitCommandResult[];
  status: ExecutionStatus;
}

/** Owns the shared live execution gate, confirmation keys, and command results. */
export function useGitPlanExecution(
  mode: Mode,
  commands: PlannedGitCommand[] | null,
  isActive: boolean,
): GitPlanExecutionState {
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [results, setResults] = useState<GitCommandResult[]>([]);
  const [error, setError] = useState("");
  const executionVersion = useRef(0);
  const policy = commands ? getPlanExecutionPolicy(commands) : null;

  useEffect(
    () => () => {
      executionVersion.current += 1;
    },
    [],
  );

  const reset = () => {
    executionVersion.current += 1;
    setStatus("idle");
    setResults([]);
    setError("");
  };

  async function runExecution(allowMutation: boolean) {
    if (!commands) return;

    const currentExecution = ++executionVersion.current;
    setStatus("running");
    setResults([]);
    setError("");

    try {
      const completedResults = await executeGitPlan(commands, allowMutation);
      if (executionVersion.current !== currentExecution) return;
      setResults(completedResults);
      setStatus("done");
    } catch (caught) {
      if (executionVersion.current !== currentExecution) return;
      if (caught instanceof GitPlanExecutionError) {
        setResults(caught.completedResults);
      }
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("error");
    }
  }

  useInput(
    (input) => {
      if (mode !== "live" || !policy || !commands) return;

      if (status === "idle" && input.toLowerCase() === "e") {
        if (policy.level === "read-only") {
          void runExecution(false);
        } else if (policy.level === "confirm") {
          setStatus("confirm");
        }
        return;
      }

      if (status !== "confirm") return;
      if (input.toLowerCase() === "y") {
        void runExecution(true);
      } else if (input.toLowerCase() === "n") {
        setStatus("idle");
      }
    },
    { isActive: mode === "live" && isActive },
  );

  return { error, policy, reset, results, status };
}
