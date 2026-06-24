import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Gradient from "ink-gradient";
import { colors, gradients, menu, type ScreenId } from "../theme.ts";

interface HomeScreenProps {
  onSelect: (id: ScreenId) => void;
}

/** Landing dashboard: a quick value-prop line plus the launchable feature list. */
export function HomeScreen({ onSelect }: HomeScreenProps) {
  const items = menu.map((m) => ({
    label: `${m.icon}  ${m.label.padEnd(8)} ${m.hint}`,
    value: m.id,
  }));

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
        <Text color={colors.faint}>Pick a tool to try the demo ↓</Text>
      </Box>

      <SelectInput
        items={items}
        onSelect={(item) => onSelect(item.value as ScreenId)}
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
  );
}
