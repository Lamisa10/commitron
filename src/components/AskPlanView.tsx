import React from "react";
import { Box, Text } from "ink";
import type { Mode } from "../config.ts";
import type { AskPlan } from "../types/git-plan.ts";
import { formatGitCommand } from "../services/git-policy.ts";
import { colors, border } from "../theme.ts";
import { CommandLine, Hint } from "./shared.tsx";

interface AskPlanViewProps {
  mode: Mode;
  plan: AskPlan;
  ran: boolean;
  stage: "review" | "result";
}

/** Displays an interpreted plan and clearly distinguishes demo execution from live preview. */
export function AskPlanView({ mode, plan, ran, stage }: AskPlanViewProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={colors.dim}>Interpreted intent</Text>
      <Text color={colors.text}>“{plan.intent}”</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.dim}>Plan</Text>
        {plan.commands.map((command, index) => (
          <CommandLine key={index} cmd={formatGitCommand(command)} />
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.dim}>What this does</Text>
        <Text color={colors.text}>{plan.explanation}</Text>
      </Box>

      {plan.destructive && plan.warning ? (
        <Box
          flexDirection="column"
          borderStyle={border}
          borderColor={colors.red}
          paddingX={1}
          marginTop={1}
        >
          <Text color={colors.red} bold>
            ⚠ Destructive operation
          </Text>
          <Text color={colors.yellow}>{plan.warning}</Text>
        </Box>
      ) : null}

      {stage === "review" ? (
        <Box marginTop={1}>
          <Text color={colors.text}>
            Run this? <Text color={colors.green}>[y]</Text>{" "}
            <Text color={colors.red}>[n]</Text>
          </Text>
        </Box>
      ) : mode === "demo" ? (
        <Box marginTop={1} flexDirection="column">
          {ran || !plan.destructive ? (
            <Text color={colors.green}>✔ Done — command executed.</Text>
          ) : (
            <Text color={colors.yellow}>✗ Cancelled — nothing was run.</Text>
          )}
          <Hint>Press r to ask something else.</Hint>
        </Box>
      ) : null}
    </Box>
  );
}
