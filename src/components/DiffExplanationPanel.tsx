import React from "react";
import { Box, Text } from "ink";
import type { DiffExplanation } from "../types/live-features.ts";
import { border, colors } from "../theme.ts";
import { Hint } from "./shared.tsx";

/** Renders the structured overview, per-file notes, and risk assessment. */
export function DiffExplanationPanel({
  explanation,
}: {
  explanation: DiffExplanation;
}) {
  const riskColor =
    explanation.riskLevel === "high"
      ? colors.red
      : explanation.riskLevel === "medium"
        ? colors.yellow
        : colors.green;
  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={colors.cyan}
      paddingX={1}
    >
      <Text color={colors.cyan} bold>
        What changed
      </Text>
      <Text color={colors.text}>{explanation.overview}</Text>
      <Box flexDirection="column" marginTop={1}>
        {explanation.files.map((file) => (
          <Text key={file.path} color={colors.text}>
            <Text color={colors.violet}>• {file.path}</Text> — {file.explanation}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={riskColor} bold>
          Risk: {explanation.riskLevel}
        </Text>
        <Text color={colors.text}> — {explanation.riskExplanation}</Text>
      </Box>
      <Hint>Press r to explain another scope.</Hint>
    </Box>
  );
}
