import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import type { Mode } from "../config.ts";
import { colors, gradients, type ScreenId } from "../theme.ts";
import { FeatureMenu } from "./FeatureMenu.tsx";

interface HomeScreenProps {
  mode: Mode;
  onSelect: (id: ScreenId) => void;
}

/** Landing dashboard: a quick value-prop line plus the launchable feature list. */
export function HomeScreen({ mode, onSelect }: HomeScreenProps) {
  return (
    <Box flexDirection="column">
      <Gradient colors={[...gradients.brand]}>
        <Text bold>Talk to Git in plain English.</Text>
      </Gradient>
      <Text color={colors.dim}>
        Commitron turns natural-language intent into safe Git commands, writes your
      </Text>
      <Text color={colors.dim}>
        commit messages, names your branches, and explains what changed.
      </Text>

      <Box marginTop={1} marginBottom={1}>
        <Text color={colors.faint}>
          {mode === "live"
            ? "Live mode · demo-only tools are dimmed"
            : "Pick a tool to try the demo ↓"}
        </Text>
      </Box>

      <FeatureMenu mode={mode} onSelect={onSelect} />
    </Box>
  );
}
