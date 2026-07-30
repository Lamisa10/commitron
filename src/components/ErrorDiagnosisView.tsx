import React from "react";
import { Box, Text } from "ink";
import { formatGitCommand } from "../services/git-policy.ts";
import type { GitErrorDiagnosis } from "../types/live-features.ts";
import { border, colors } from "../theme.ts";
import { CommandLine } from "./shared.tsx";

interface ErrorDiagnosisViewProps {
  command: string;
  diagnosis: GitErrorDiagnosis;
  errorOutput: string;
}

/** Displays the pasted failure, diagnosis, and suggested recovery commands. */
export function ErrorDiagnosisView({
  command,
  diagnosis,
  errorOutput,
}: ErrorDiagnosisViewProps) {
  return (
    <Box flexDirection="column">
      <CommandLine cmd={command} color={colors.text} />
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.red}
        paddingX={1}
        marginTop={1}
        marginBottom={1}
      >
        <Text color={colors.red}>{errorOutput}</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.cyan}
        paddingX={1}
      >
        <Text color={colors.cyan} bold>
          What happened
        </Text>
        <Text color={colors.text}>{diagnosis.summary}</Text>
        <Text color={colors.dim}>{diagnosis.cause}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.green} bold>
          Suggested recovery
        </Text>
        {diagnosis.commands.length ? (
          diagnosis.commands.map((commandItem, index) => (
            <CommandLine
              key={index}
              cmd={formatGitCommand(commandItem)}
              color={colors.green}
            />
          ))
        ) : (
          <>
            <Text color={colors.yellow}>
              No Git command is safe to suggest automatically.
            </Text>
            <Text color={colors.faint}>Press r to start over.</Text>
          </>
        )}
        {diagnosis.cautions.map((caution, index) => (
          <Text key={index} color={colors.yellow}>
            • {caution}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
