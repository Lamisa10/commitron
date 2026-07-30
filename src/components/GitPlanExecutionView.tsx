import React from "react";
import { Box, Text } from "ink";
import type { GitCommandResult } from "../services/git-execution.ts";
import {
  formatGitCommand,
  type PlanExecutionPolicy,
} from "../services/git-policy.ts";
import type { ExecutionStatus } from "../hooks/useGitPlanExecution.ts";
import { colors, border } from "../theme.ts";
import { CommandLine, Hint, Thinking } from "./shared.tsx";

interface GitPlanExecutionViewProps {
  error: string;
  policy: PlanExecutionPolicy;
  results: GitCommandResult[];
  status: ExecutionStatus;
}

/** Shows the locally determined execution policy and bounded Git output. */
export function GitPlanExecutionView({
  error,
  policy,
  results,
  status,
}: GitPlanExecutionViewProps) {
  if (policy.level === "manual") {
    return (
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.yellow}
        paddingX={1}
        marginTop={1}
      >
        <Text color={colors.yellow} bold>
          ◇ MANUAL ONLY
        </Text>
        <Text color={colors.text}>{policy.reason}</Text>
        <Text color={colors.dim}>
          Review the plan and run it yourself if you accept the risk.
        </Text>
        <Hint>Press r to start over.</Hint>
      </Box>
    );
  }

  if (status === "running") {
    return (
      <Box marginTop={1}>
        <Thinking label="Running approved Git commands" />
      </Box>
    );
  }

  if (status === "confirm") {
    return (
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.yellow}
        paddingX={1}
        marginTop={1}
      >
        <Text color={colors.yellow} bold>
          ◇ CONFIRM EXECUTION
        </Text>
        <Text color={colors.text}>{policy.reason}</Text>
        <Text color={colors.text}>
          Execute this plan? <Text color={colors.green}>[y]</Text>{" "}
          <Text color={colors.red}>[n]</Text>
        </Text>
      </Box>
    );
  }

  if (status === "done") {
    return (
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.green}
        paddingX={1}
        marginTop={1}
      >
        <Text color={colors.green} bold>
          ✔ Executed
        </Text>
        {results.map((result, resultIndex) => (
          <Box key={resultIndex} flexDirection="column" marginTop={resultIndex ? 1 : 0}>
            <CommandLine cmd={formatGitCommand(result.command)} color={colors.green} />
            {result.output.map((line, lineIndex) => (
              <Text key={lineIndex} color={colors.text}>
                {line}
              </Text>
            ))}
            {result.truncated ? (
              <Text color={colors.faint}>… output truncated</Text>
            ) : null}
          </Box>
        ))}
        <Hint>Press r to start over.</Hint>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.red}
        paddingX={1}
        marginTop={1}
      >
        <Text color={colors.red} bold>
          ✖ Execution stopped
        </Text>
        <Text color={colors.text}>{error}</Text>
        {results.length ? (
          <Text color={colors.yellow}>
            {results.length} earlier command{results.length === 1 ? "" : "s"} completed.
          </Text>
        ) : null}
        <Hint>Press r to start over.</Hint>
      </Box>
    );
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text color={colors.violet} bold>
        ◇ READY TO EXECUTE
      </Text>
      <Text color={colors.faint}>{policy.reason}</Text>
      <Hint>
        {policy.level === "read-only"
          ? "Press e to execute · r to start over."
          : "Press e to review execution · r to start over."}
      </Hint>
    </Box>
  );
}
