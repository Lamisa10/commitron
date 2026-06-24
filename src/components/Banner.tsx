import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { colors, gradients } from "../theme.ts";

/** The gradient COMMITRON wordmark + tagline shown in the header. */
export function Banner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Box>
        <Gradient colors={[...gradients.brand]}>
          <Text bold>◆ COMMITRON</Text>
        </Gradient>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center">
      <Gradient colors={[...gradients.brand]}>
        <BigText text="COMMITRON" font="tiny" />
      </Gradient>
      <Text color={colors.dim}>
        AI-Powered Git Commit & Branch Assistant{" "}
        <Text color={colors.faint}>· prototype</Text>
      </Text>
    </Box>
  );
}
