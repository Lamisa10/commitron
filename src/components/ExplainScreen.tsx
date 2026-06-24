import React from "react";
import { Box, Text } from "ink";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, DiffView } from "./shared.tsx";
import { useFakeAI } from "../hooks/useFakeAI.ts";
import { stagedDiff, explainSummary } from "../data/mock.ts";
import { colors, border } from "../theme.ts";

/** Produces a plain-English summary of the current changes. */
export function ExplainScreen() {
  const { phase, run } = useFakeAI(1500);

  React.useEffect(() => {
    run();
  }, []);

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="❖"
        title="Explain"
        subtitle="A plain-English readout of what your diff actually does."
      />

      <Text color={colors.dim}>Reviewing changes</Text>
      <Box marginBottom={1}>
        <DiffView lines={stagedDiff} />
      </Box>

      {phase !== "done" ? (
        <Thinking label="Summarizing the diff" />
      ) : (
        <Box
          flexDirection="column"
          borderStyle={border}
          borderColor={colors.cyan}
          paddingX={1}
        >
          {explainSummary.map((line, i) => (
            <Text
              key={i}
              color={line.startsWith("Risk") ? colors.yellow : colors.text}
            >
              {line || " "}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
