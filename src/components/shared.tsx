import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { colors, border } from "../theme.ts";
import type { DiffLine } from "../data/mock.ts";

/** Animated "AI is thinking" line shown during the simulated round-trip. */
export function Thinking({ label = "Asking the model" }: { label?: string }) {
  return (
    <Box>
      <Text color={colors.cyan}>
        <Spinner type="dots" />
      </Text>
      <Text color={colors.dim}> {label}…</Text>
    </Box>
  );
}

/** Renders a fake git diff with add/del/context coloring. */
export function DiffView({ lines }: { lines: DiffLine[] }) {
  const colorFor = (t: DiffLine["type"]) =>
    t === "add" ? colors.green : t === "del" ? colors.red : t === "meta" ? colors.violet : colors.dim;

  return (
    <Box
      flexDirection="column"
      borderStyle={border}
      borderColor={colors.faint}
      paddingX={1}
    >
      {lines.map((l, i) => (
        <Text key={i} color={colorFor(l.type)} dimColor={l.type === "ctx"}>
          {l.text}
        </Text>
      ))}
    </Box>
  );
}

/** A small key/value chip row, e.g. for config or status. */
export function Field({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Box width={16}>
        <Text color={colors.dim}>{label}</Text>
      </Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

/** A labeled command line, monospace-styled with a $ prompt. */
export function CommandLine({ cmd, color = colors.cyan }: { cmd: string; color?: string }) {
  return (
    <Text>
      <Text color={colors.faint}>$ </Text>
      <Text color={color}>{cmd}</Text>
    </Text>
  );
}

/** A hint shown to nudge the user toward the next action. */
export function Hint({ children }: { children: React.ReactNode }) {
  return <Text color={colors.faint}>{children}</Text>;
}
