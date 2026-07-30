import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Config } from "../config.ts";
import {
  executeCommitStackItem,
  getChangeInventory,
} from "../services/commit-stack.ts";
import { planCommitStack } from "../services/commit-planner.ts";
import { isGitServiceError } from "../services/git.ts";
import type {
  ChangeInventory,
  CommitStackItem,
  CommitStackPlan,
  CommitStackResult,
} from "../types/commit-stack.ts";
import { colors } from "../theme.ts";
import {
  buildExecutableGroups,
  moveFileToNextCommit,
  toggleExcludedPath,
} from "./commit-stack-editing.ts";
import { CommitStackConfirmation } from "./CommitStackConfirmation.tsx";
import {
  CommitStackCancelled,
  CommitStackComplete,
} from "./CommitStackOutcome.tsx";
import { CommitStackReview } from "./CommitStackReview.tsx";
import { FeatureErrorView, type FeatureError } from "./FeatureErrorView.tsx";
import { friendlyModelError } from "./feature-errors.ts";
import { Hint, Thinking } from "./shared.tsx";

type Stage =
  | "loading"
  | "planning"
  | "review"
  | "files"
  | "confirm"
  | "committing"
  | "done"
  | "cancelled"
  | "empty"
  | "error";

interface CommitStackScreenProps {
  cfg: Config;
  executeItem?: typeof executeCommitStackItem;
  loadInventory?: typeof getChangeInventory;
  planStack?: typeof planCommitStack;
}

/** Coordinates planning, whole-file editing, and confirmed sequential commits. */
export function CommitStackScreen({
  cfg,
  executeItem = executeCommitStackItem,
  loadInventory = getChangeInventory,
  planStack = planCommitStack,
}: CommitStackScreenProps) {
  const [stage, setStage] = useState<Stage>("loading");
  const [inventory, setInventory] = useState<ChangeInventory | null>(null);
  const [plan, setPlan] = useState<CommitStackPlan | null>(null);
  const [selectedCommit, setSelectedCommit] = useState(0);
  const [selectedFile, setSelectedFile] = useState(0);
  const [excludedPaths, setExcludedPaths] = useState(new Set<string>());
  const [executionGroups, setExecutionGroups] = useState<CommitStackItem[]>([]);
  const [confirmIndex, setConfirmIndex] = useState(0);
  const [results, setResults] = useState<CommitStackResult[]>([]);
  const [error, setError] = useState<FeatureError | null>(null);
  const [planningProgress, setPlanningProgress] = useState({
    completed: 0,
    total: 0,
  });
  const requestVersion = useRef(0);

  useEffect(() => {
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, []);

  async function load() {
    const request = ++requestVersion.current;
    setStage("loading");
    setInventory(null);
    setPlan(null);
    setExcludedPaths(new Set());
    setExecutionGroups([]);
    setResults([]);
    setError(null);
    setPlanningProgress({ completed: 0, total: 0 });

    try {
      const changes = await loadInventory(cfg.mode);
      if (requestVersion.current !== request) return;
      setInventory(changes);
      if (!changes.files.length) {
        setStage("empty");
        return;
      }
      setStage("planning");
      setPlanningProgress({ completed: 0, total: changes.files.length });
      const proposedPlan = await planStack(changes, cfg, {
        onProgress: (completed, total) => {
          if (requestVersion.current === request) {
            setPlanningProgress({ completed, total });
          }
        },
      });
      if (requestVersion.current !== request) return;
      setPlan(proposedPlan);
      setSelectedCommit(0);
      setSelectedFile(0);
      setStage("review");
    } catch (caught) {
      if (requestVersion.current !== request) return;
      setError(friendlyStackError(caught));
      setStage("error");
    }
  }

  function startExecution() {
    if (!plan || !inventory) return;
    const groups = buildExecutableGroups(plan, inventory, excludedPaths);
    if (!groups.length) {
      setError({
        kind: "error",
        title: "Nothing selected",
        message: "Include at least one file before starting the commit sequence.",
      });
      setStage("error");
      return;
    }
    setExecutionGroups(groups);
    setConfirmIndex(0);
    setResults([]);
    setStage("confirm");
  }

  async function createCurrentCommit() {
    if (!inventory) return;
    const item = executionGroups[confirmIndex];
    if (!item) return;

    setStage("committing");
    try {
      const result = await executeItem(
        item,
        inventory.fingerprint,
        confirmIndex === 0,
        cfg.mode,
      );
      const completed = [...results, result];
      setResults(completed);
      if (confirmIndex + 1 < executionGroups.length) {
        setConfirmIndex(confirmIndex + 1);
        setStage("confirm");
      } else {
        setStage("done");
      }
    } catch (caught) {
      setError(friendlyStackError(caught));
      setStage("error");
    }
  }

  useInput(
    (input, key) => {
      if (!plan) return;
      if (stage === "review") {
        if (key.upArrow || key.downArrow) {
          const direction = key.downArrow ? 1 : -1;
          setSelectedCommit(
            (selectedCommit + direction + plan.commits.length) %
              plan.commits.length,
          );
        } else if (key.return) {
          setSelectedFile(0);
          setStage("files");
        } else if (input.toLowerCase() === "e") {
          startExecution();
        }
        return;
      }

      if (stage === "files") {
        const files = plan.commits[selectedCommit]?.files ?? [];
        if (key.upArrow || key.downArrow) {
          if (!files.length) return;
          const direction = key.downArrow ? 1 : -1;
          setSelectedFile(
            (selectedFile + direction + files.length) % files.length,
          );
        } else if (input.toLowerCase() === "x") {
          const path = files[selectedFile];
          if (path) toggleExcludedPath(path, setExcludedPaths);
        } else if (input.toLowerCase() === "m") {
          moveFileToNextCommit(
            plan,
            selectedCommit,
            selectedFile,
            setPlan,
          );
          if (files.length <= 1) {
            setSelectedFile(0);
            setStage("review");
          } else {
            setSelectedFile((index) => Math.max(0, index - 1));
          }
        } else if (input.toLowerCase() === "b") {
          setStage("review");
        }
      }
    },
    { isActive: stage === "review" || stage === "files" },
  );

  useInput(
    (input) => {
      if (input.toLowerCase() === "y") {
        void createCurrentCommit();
      } else if (input.toLowerCase() === "n") {
        setStage("cancelled");
      }
    },
    { isActive: stage === "confirm" },
  );

  useInput(
    (input) => {
      if (input.toLowerCase() === "r") void load();
    },
    {
      isActive:
        stage === "done" ||
        stage === "cancelled" ||
        stage === "empty" ||
        stage === "error",
    },
  );

  if (stage === "loading") return <Thinking label="Inventorying repository changes" />;
  if (stage === "planning") {
    return (
      <Thinking
        label={
          planningProgress.completed
            ? `Analyzing ${planningProgress.completed}/${planningProgress.total} files`
            : `Preparing ${planningProgress.total || inventory?.files.length || 0} files`
        }
      />
    );
  }
  if (stage === "empty") {
    return (
      <Box flexDirection="column">
        <Text color={colors.yellow}>No tracked or untracked changes found.</Text>
        <Hint>Press r to scan again.</Hint>
      </Box>
    );
  }
  if (stage === "error" && error) return <FeatureErrorView error={error} />;
  if (plan && (stage === "review" || stage === "files")) {
    return (
      <CommitStackReview
        editingFiles={stage === "files"}
        excludedPaths={excludedPaths}
        plan={plan}
        selectedCommit={selectedCommit}
        selectedFile={selectedFile}
      />
    );
  }
  if (stage === "confirm") {
    const item = executionGroups[confirmIndex];
    return item ? (
      <CommitStackConfirmation
        index={confirmIndex}
        item={item}
        total={executionGroups.length}
      />
    ) : null;
  }
  if (stage === "committing") {
    return <Thinking label={`Creating commit ${confirmIndex + 1}`} />;
  }
  if (stage === "done") return <CommitStackComplete results={results} />;
  if (stage === "cancelled") {
    return <CommitStackCancelled completedCount={results.length} />;
  }
  return null;
}

function friendlyStackError(error: unknown): FeatureError {
  if (isGitServiceError(error, "NOT_REPOSITORY")) {
    return {
      kind: "repository",
      title: "Not a Git repository",
      message: "Commitron can't inventory changes in this folder.",
      nextStep: "Run `git init` or launch Commitron from an existing repository.",
    };
  }
  return friendlyModelError(error, "Couldn't build the commit stack");
}
