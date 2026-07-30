import React from "react";
import { Box, Text } from "ink";
import type { CommitStackItem } from "../types/commit-stack.ts";
import { border, colors } from "../theme.ts";

interface CommitStackConfirmationProps {
  index: number;
  item: CommitStackItem;
  total: number;
}

/** Per-commit confirmation gate; the first gate explains index reorganization. */
export function CommitStackConfirmation({
  index,
  item,
  total,
}: CommitStackConfirmationProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={colors.yellow}
      paddingX={1}
    >
      <Text color={colors.yellow} bold>
        ◇ CONFIRM COMMIT {index + 1}/{total}
      </Text>
      <Text color={colors.text}>{item.subject}</Text>
      <Text color={colors.dim}>{item.body}</Text>
      {item.files.map((path) => (
        <Text key={path} color={colors.text}>
          • {path}
        </Text>
      ))}
      {index === 0 ? (
        <Text color={colors.yellow}>
          The first commit will reorganize the index. Working-tree content is preserved.
        </Text>
      ) : null}
      <Text color={colors.text}>
        Create this commit? <Text color={colors.green}>[y]</Text>{" "}
        <Text color={colors.red}>[n]</Text>
      </Text>
    </Box>
  );
}
