import React from "react";
import { Box, Text } from "ink";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, CommandLine } from "./shared.tsx";
import { useFakeAI } from "../hooks/useFakeAI.ts";
import { sampleError } from "../data/mock.ts";
import { colors, border } from "../theme.ts";

/** Decodes a cryptic Git failure into a beginner-friendly explanation + fix. */
export function ErrorHelperScreen() {
  const { phase, run } = useFakeAI(1500);

  React.useEffect(() => {
    run();
  }, []);

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⚠"
        title="Fix Error"
        subtitle="Commitron catches a failed Git command and explains it."
      />

      <CommandLine cmd={sampleError.command} color={colors.text} />
      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={colors.red}
        paddingX={1}
        marginTop={1}
        marginBottom={1}
      >
        {sampleError.raw.map((line, i) => (
          <Text key={i} color={i < 2 ? colors.red : colors.faint}>
            {line}
          </Text>
        ))}
      </Box>

      {phase !== "done" ? (
        <Thinking label="Decoding the error" />
      ) : (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle={border}
            borderColor={colors.cyan}
            paddingX={1}
          >
            <Text color={colors.cyan} bold>
              What happened
            </Text>
            <Text color={colors.text}>{sampleError.friendly}</Text>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.green} bold>
              ✔ Suggested fix
            </Text>
            {sampleError.fix.map((c, i) => (
              <CommandLine key={i} cmd={c} color={colors.green} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
