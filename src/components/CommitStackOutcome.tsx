import React from "react";
import { Box, Text } from "ink";
import type { CommitStackResult } from "../types/commit-stack.ts";
import { border, colors } from "../theme.ts";
import { Hint } from "./shared.tsx";

export function CommitStackComplete({
  results,
}: {
  results: CommitStackResult[];
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={colors.green}
      paddingX={1}
    >
      <Text color={colors.green} bold>
        ✔ Commit stack complete
      </Text>
      {results.map((result, index) => (
        <Text key={`${result.hash}-${index}`} color={colors.text}>
          {index + 1}. {result.hash ? `[${result.hash}] ` : ""}
          {result.subject}
        </Text>
      ))}
      <Hint>Press r to scan remaining changes.</Hint>
    </Box>
  );
}

export function CommitStackCancelled({
  completedCount,
}: {
  completedCount: number;
}) {
  return (
    <Box flexDirection="column">
      <Text color={colors.yellow} bold>
        ◇ Commit sequence stopped
      </Text>
      <Text color={colors.text}>
        {completedCount
          ? `${completedCount} commits were created. Remaining changes are unstaged.`
          : "Nothing was committed and the index was not changed."}
      </Text>
      <Hint>Press r to build a fresh plan.</Hint>
    </Box>
  );
}
