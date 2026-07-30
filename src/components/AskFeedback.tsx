import React from "react";
import { Box, Text } from "ink";
import type { Mode } from "../config.ts";
import { colors, border } from "../theme.ts";
import { Hint } from "./shared.tsx";

export interface AskError {
  kind: "repository" | "error";
  title: string;
  message: string;
  nextStep?: string;
}

/** Labels whether Ask is running the simulated demo or the live preview workflow. */
export function AskModeNotice({ mode }: { mode: Mode }) {
  return (
    <Box marginBottom={1}>
      <Text color={mode === "live" ? colors.cyan : colors.yellow} bold>
        ◇ {mode === "live" ? "LIVE ASK" : "DEMO ONLY"}
      </Text>
      <Text color={colors.faint}>
        {mode === "live"
          ? " · Repository-aware · approved commands can run"
          : " · Mock plans — no Git commands run"}
      </Text>
    </Box>
  );
}

/** Presents live planning failures as compact, actionable feedback. */
export function AskErrorView({ error }: { error: AskError }) {
  const accent = error.kind === "repository" ? colors.yellow : colors.red;

  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={accent}
      paddingX={1}
      marginTop={1}
    >
      <Text color={accent} bold>
        {error.kind === "repository" ? "◇" : "✖"} {error.title}
      </Text>
      <Text color={colors.text}>{error.message}</Text>
      {error.nextStep ? (
        <Box marginTop={1}>
          <Text color={colors.dim}>{error.nextStep}</Text>
        </Box>
      ) : null}
      <Hint>Press r to try another request.</Hint>
    </Box>
  );
}
