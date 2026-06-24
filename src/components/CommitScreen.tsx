import React, { useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, DiffView, Hint } from "./shared.tsx";
import { useFakeAI } from "../hooks/useFakeAI.ts";
import { stagedDiff, commitCandidates } from "../data/mock.ts";
import { colors, border } from "../theme.ts";

/**
 * Reads the (mock) staged diff and offers three Conventional-Commit candidates
 * in an interactive picker.
 */
export function CommitScreen() {
  const { phase, run } = useFakeAI(1500);
  const [chosen, setChosen] = useState<number | null>(null);

  // Kick off the simulated generation on first render.
  React.useEffect(() => {
    run();
  }, []);

  const items = commitCandidates.map((c, i) => ({ label: c.label, value: i }));

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="✎"
        title="Commit"
        subtitle="Conventional-Commit messages generated from your staged diff."
      />

      <Text color={colors.dim}>Staged changes (2 files)</Text>
      <Box marginTop={0} marginBottom={1}>
        <DiffView lines={stagedDiff} />
      </Box>

      {phase !== "done" ? (
        <Thinking label="Writing commit messages" />
      ) : chosen === null ? (
        <Box flexDirection="column">
          <Text color={colors.dim}>Choose a message</Text>
          <SelectInput
            items={items}
            onSelect={(item) => setChosen(item.value as number)}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? colors.cyan : colors.text} bold={isSelected}>
                {label}
              </Text>
            )}
          />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle={border}
            borderColor={colors.green}
            paddingX={1}
          >
            <Text color={colors.green} bold>
              ✔ Committed
            </Text>
            <Text color={colors.text}>{commitCandidates[chosen].label}</Text>
            <Text color={colors.dim}>{commitCandidates[chosen].body}</Text>
          </Box>
          <Hint>[a3f9c1] 2 files changed, 5 insertions(+), 1 deletion(-)</Hint>
        </Box>
      )}
    </Box>
  );
}
