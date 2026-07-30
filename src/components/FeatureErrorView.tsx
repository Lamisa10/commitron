import React from "react";
import { Box, Text } from "ink";
import { border, colors } from "../theme.ts";

export interface FeatureError {
  kind: "repository" | "error";
  message: string;
  nextStep?: string;
  title: string;
}

/** Consistent compact error treatment for live feature screens. */
export function FeatureErrorView({ error }: { error: FeatureError }) {
  const color = error.kind === "repository" ? colors.yellow : colors.red;
  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={color}
      paddingX={1}
      marginTop={1}
    >
      <Text color={color} bold>
        {error.kind === "repository" ? "◇" : "✖"} {error.title}
      </Text>
      <Text color={colors.text}>{error.message}</Text>
      {error.nextStep ? (
        <Box marginTop={1}>
          <Text color={colors.dim}>{error.nextStep}</Text>
        </Box>
      ) : null}
      <Text color={colors.faint}>Press r to try again.</Text>
    </Box>
  );
}
