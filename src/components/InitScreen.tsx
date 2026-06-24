import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { ScreenTitle } from "./Layout.tsx";
import { Hint } from "./shared.tsx";
import { defaultConfig } from "../data/mock.ts";
import { loadConfig, saveConfig, type Mode } from "../config.ts";
import { colors } from "../theme.ts";

const models = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"];
const styles = ["Conventional Commits", "Gitmoji", "Plain"];
const modes: Mode[] = ["demo", "live"];

type Editing = null | "key" | "model" | "style" | "mode";

/**
 * Setup is an editable settings list: it loads the current config and shows each
 * value (API key masked). Selecting a row edits just that one field and saves it
 * immediately to ~/.config/commitron/config.json.
 */
export function InitScreen() {
  const initial = useMemo(() => loadConfig(), []);
  const [apiKey, setApiKey] = useState(initial.apiKey ?? "");
  const [model, setModel] = useState(initial.model);
  const [style, setStyle] = useState(initial.commitStyle);
  const [mode, setMode] = useState<Mode>(initial.requestedMode);
  const [editing, setEditing] = useState<Editing>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const masked = apiKey ? `sk-…${apiKey.slice(-4)}` : "(not set)";

  function persist(update: Parameters<typeof saveConfig>[0]) {
    try {
      saveConfig(update);
      setNote("Saved.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function submitKey() {
    const trimmed = keyDraft.trim();
    if (trimmed) {
      const goLive = !apiKey; // adding a key for the first time implies live mode
      setApiKey(trimmed);
      if (goLive) setMode("live");
      persist({ openaiKey: trimmed, ...(goLive ? { mode: "live" as Mode } : {}) });
    }
    setKeyDraft("");
    setEditing(null);
  }

  const rows = [
    { id: "key" as const, label: "API key", value: masked },
    { id: "model" as const, label: "Model", value: model },
    { id: "style" as const, label: "Commit style", value: style },
    { id: "mode" as const, label: "Mode", value: mode },
  ];

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⚙"
        title="Setup"
        subtitle={`Current settings · saved to ${defaultConfig.configPath}`}
      />

      {editing === null && (
        <Box flexDirection="column">
          <SelectInput
            items={rows.map((r) => ({ label: `${r.label.padEnd(14)}${r.value}`, value: r.id }))}
            onSelect={(item) => {
              setNote("");
              if (item.value === "key") setKeyDraft("");
              setEditing(item.value as Editing);
            }}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? colors.cyan : colors.text} bold={isSelected}>
                {label}
              </Text>
            )}
          />
          {mode === "live" && !apiKey && (
            <Text color={colors.yellow}>⚠ Live needs a key — add one above, or it runs in demo.</Text>
          )}
          <Box marginTop={1}>
            <Hint>↑↓ move · Enter edit · Esc back to menu{note ? ` · ${note}` : ""}</Hint>
          </Box>
          {error && <Text color={colors.red}>Couldn't save: {error}</Text>}
        </Box>
      )}

      {editing === "key" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>OpenAI API key</Text>
          <Box>
            <Text color={colors.cyan}>{"key ❯ "}</Text>
            <TextInput
              value={keyDraft}
              onChange={setKeyDraft}
              onSubmit={submitKey}
              placeholder={apiKey ? "leave blank to keep current" : "sk-..."}
              mask="•"
            />
          </Box>
          <Hint>Enter to save · stored locally, never shared.</Hint>
        </Box>
      )}

      {editing === "model" && (
        <EditChoice title="Default model" items={models} current={model} onPick={(v) => {
          setModel(v);
          persist({ model: v });
          setEditing(null);
        }} />
      )}

      {editing === "style" && (
        <EditChoice title="Commit style" items={styles} current={style} onPick={(v) => {
          setStyle(v);
          persist({ commitStyle: v });
          setEditing(null);
        }} />
      )}

      {editing === "mode" && (
        <EditChoice title="Mode" items={modes} current={mode} onPick={(v) => {
          setMode(v as Mode);
          persist({ mode: v as Mode });
          setEditing(null);
        }} />
      )}
    </Box>
  );
}

/** A single-field picker that pre-selects the current value. */
function EditChoice({
  title,
  items,
  current,
  onPick,
}: {
  title: string;
  items: string[];
  current: string;
  onPick: (value: string) => void;
}) {
  return (
    <Box flexDirection="column">
      <Text color={colors.dim}>{title}</Text>
      <SelectInput
        items={items.map((m) => ({ label: m, value: m }))}
        initialIndex={Math.max(0, items.indexOf(current))}
        onSelect={(item) => onPick(item.value)}
        indicatorComponent={({ isSelected }) => (
          <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
        )}
        itemComponent={({ isSelected, label }) => (
          <Text color={isSelected ? colors.cyan : colors.text} bold={isSelected}>
            {label}
          </Text>
        )}
      />
      <Hint>Enter to choose</Hint>
    </Box>
  );
}
