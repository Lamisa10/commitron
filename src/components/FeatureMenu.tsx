import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Mode } from "../config.ts";
import { colors, menu, type MenuItem, type ScreenId } from "../theme.ts";

interface FeatureMenuProps {
  mode: Mode;
  onSelect: (id: ScreenId) => void;
}

function isAvailable(item: MenuItem, mode: Mode): boolean {
  return mode === "demo" || item.availableInLive;
}

/** Feature picker that can keep future demo-only rows visible but unselectable in live mode. */
export function FeatureMenu({ mode, onSelect }: FeatureMenuProps) {
  const availableItems = menu.filter((item) => isAvailable(item, mode));
  const [selectedId, setSelectedId] = useState<ScreenId>(
    () => availableItems[0]?.id ?? "init",
  );

  useInput((_input, key) => {
    const currentIndex = availableItems.findIndex((item) => item.id === selectedId);

    if (key.upArrow || key.downArrow) {
      const direction = key.downArrow ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + availableItems.length) % availableItems.length;
      setSelectedId(availableItems[nextIndex].id);
    }

    if (key.return) onSelect(selectedId);
  });

  return (
    <Box flexDirection="column">
      {menu.map((item) => {
        const available = isAvailable(item, mode);
        const selected = available && item.id === selectedId;

        return (
          <Box key={item.id}>
            <Text color={selected ? colors.cyan : colors.faint}>
              {selected ? "› " : "  "}
            </Text>
            <Text
              color={selected ? colors.cyan : available ? colors.text : colors.faint}
              bold={selected}
            >
              {item.icon}  {item.label.padEnd(8)}
            </Text>
            <Text color={available ? colors.text : colors.faint}>
              {available ? item.hint : "DEMO ONLY"}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
