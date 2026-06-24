import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { ScreenTitle } from "./Layout.tsx";
import { Field, Hint } from "./shared.tsx";
import { defaultConfig } from "../data/mock.ts";
import { colors, border } from "../theme.ts";

type Step = "key" | "model" | "style" | "done";

const models = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"];
const styles = ["Conventional Commits", "Gitmoji", "Plain"];

/** A short guided setup wizard that collects an API key, model, and commit style. */
export function InitScreen() {
  const [step, setStep] = useState<Step>("key");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(defaultConfig.model);
  const [style, setStyle] = useState(defaultConfig.commitStyle);

  const masked = apiKey ? `sk-…${apiKey.slice(-4)}` : "(not set)";

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⚙"
        title="Setup"
        subtitle={`Guided configuration · saved to ${defaultConfig.configPath}`}
      />

      {/* Step 1: API key */}
      {step === "key" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>Step 1 of 3 — OpenAI API key</Text>
          <Box>
            <Text color={colors.cyan}>{"key ❯ "}</Text>
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              onSubmit={() => apiKey.trim() && setStep("model")}
              placeholder="sk-..."
              mask="•"
            />
          </Box>
          <Hint>Stored locally, never shared. Enter to continue.</Hint>
        </Box>
      )}

      {/* Step 2: model */}
      {step === "model" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>Step 2 of 3 — default model</Text>
          <SelectInput
            items={models.map((m) => ({ label: m, value: m }))}
            onSelect={(item) => {
              setModel(item.value);
              setStep("style");
            }}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
          />
        </Box>
      )}

      {/* Step 3: commit style */}
      {step === "style" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>Step 3 of 3 — commit style</Text>
          <SelectInput
            items={styles.map((s) => ({ label: s, value: s }))}
            onSelect={(item) => {
              setStyle(item.value);
              setStep("done");
            }}
            indicatorComponent={({ isSelected }) => (
              <Text color={colors.cyan}>{isSelected ? "› " : "  "}</Text>
            )}
          />
        </Box>
      )}

      {/* Summary */}
      {step === "done" && (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle={border}
            borderColor={colors.green}
            paddingX={1}
          >
            <Text color={colors.green} bold>
              ✔ Commitron is ready
            </Text>
            <Field label="API key" value={masked} color={colors.text} />
            <Field label="Model" value={model} color={colors.cyan} />
            <Field label="Commit style" value={style} color={colors.cyan} />
            <Field label="Config" value={defaultConfig.configPath} color={colors.dim} />
          </Box>
          <Hint>Try the Ask or Commit tool from the menu →</Hint>
        </Box>
      )}
    </Box>
  );
}
