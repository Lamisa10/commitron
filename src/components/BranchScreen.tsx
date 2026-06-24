import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import Gradient from "ink-gradient";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, CommandLine, Hint } from "./shared.tsx";
import { useFakeAI } from "../hooks/useFakeAI.ts";
import { branchExamples, defaultBranchSuggestion } from "../data/mock.ts";
import { colors, gradients } from "../theme.ts";

type Stage = "input" | "thinking" | "result";

/** Turns a short description into a valid kebab-case branch name and checks it out. */
export function BranchScreen() {
  const [desc, setDesc] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [name, setName] = useState(defaultBranchSuggestion);
  const { run } = useFakeAI(1400);

  const submit = (value: string) => {
    if (!value.trim()) return;
    // Match a known example, else fall back to the default suggestion.
    const key = Object.keys(branchExamples).find((k) =>
      value.toLowerCase().includes(k.split(" ")[1] ?? "")
    );
    setName(key ? branchExamples[key] : defaultBranchSuggestion);
    setStage("thinking");
    run();
    setTimeout(() => setStage("result"), 1400);
  };

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="⌥"
        title="Branch"
        subtitle="Describe the work — get a clean, conventional branch name."
      />

      <Box>
        <Text color={colors.cyan}>{"branch ❯ "}</Text>
        {stage === "input" ? (
          <TextInput
            value={desc}
            onChange={setDesc}
            onSubmit={submit}
            placeholder='e.g. "add login page with OTP"'
          />
        ) : (
          <Text color={colors.text}>{desc}</Text>
        )}
      </Box>

      {stage === "thinking" && (
        <Box marginTop={1}>
          <Thinking label="Naming your branch" />
        </Box>
      )}

      {stage === "result" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.dim}>Suggested branch</Text>
          <Gradient colors={[...gradients.success]}>
            <Text bold>  {name}</Text>
          </Gradient>
          <Box marginTop={1}>
            <CommandLine cmd={`git checkout -b ${name}`} color={colors.green} />
          </Box>
          <Box marginTop={1}>
            <Text color={colors.green}>✔ Switched to a new branch '{name}'</Text>
          </Box>
          <Hint>Esc to go back · pick another tool from the menu.</Hint>
        </Box>
      )}
    </Box>
  );
}
