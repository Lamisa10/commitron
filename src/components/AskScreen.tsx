import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { ScreenTitle } from "./Layout.tsx";
import { Thinking, CommandLine, Hint } from "./shared.tsx";
import { useFakeAI } from "../hooks/useFakeAI.ts";
import { askExamples, type AskPlan } from "../data/mock.ts";
import { colors, border } from "../theme.ts";

type Stage = "input" | "thinking" | "review" | "result";

/**
 * Headline feature: type a plain-English request, watch it become a Git plan,
 * and confirm before any destructive command runs.
 */
export function AskScreen() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [plan, setPlan] = useState<AskPlan | null>(null);
  const [ran, setRan] = useState(false);
  const { run } = useFakeAI(1500);

  // Pick a fake plan based on a keyword in the query; fall back to the default.
  const choosePlan = (q: string): AskPlan =>
    /status|change|what/i.test(q) ? askExamples.status : askExamples.default;

  const submit = (value: string) => {
    if (!value.trim()) return;
    const p = choosePlan(value);
    setPlan(p);
    setStage("thinking");
    run();
    // Mirror the fake-AI delay to advance the stage.
    setTimeout(() => setStage(p.destructive ? "review" : "result"), 1500);
  };

  // Confirm / cancel for destructive plans.
  useInput((input, key) => {
    if (stage !== "review") return;
    if (input.toLowerCase() === "y" || key.return) {
      setRan(true);
      setStage("result");
    } else if (input.toLowerCase() === "n") {
      setRan(false);
      setStage("result");
    }
  });

  const reset = () => {
    setQuery("");
    setPlan(null);
    setRan(false);
    setStage("input");
  };

  useInput(
    (input) => {
      if (stage === "result" && input.toLowerCase() === "r") reset();
    },
    { isActive: stage === "result" }
  );

  return (
    <Box flexDirection="column">
      <ScreenTitle icon="✦" title="Ask" subtitle="Describe what you want — Commitron writes the Git." />

      {/* Prompt */}
      <Box>
        <Text color={colors.cyan}>{"ask ❯ "}</Text>
        {stage === "input" ? (
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            placeholder='e.g. "undo my last commit but keep the changes"'
          />
        ) : (
          <Text color={colors.text}>{query}</Text>
        )}
      </Box>

      {stage === "thinking" && (
        <Box marginTop={1}>
          <Thinking label="Interpreting your request" />
        </Box>
      )}

      {plan && stage !== "input" && stage !== "thinking" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.dim}>Interpreted intent</Text>
          <Text color={colors.text}>“{plan.intent}”</Text>

          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.dim}>Plan</Text>
            {plan.commands.map((c, i) => (
              <CommandLine key={i} cmd={c} />
            ))}
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.dim}>What this does</Text>
            <Text color={colors.text}>{plan.explanation}</Text>
          </Box>

          {/* Destructive warning + confirm gate */}
          {plan.destructive && plan.warning && (
            <Box
              flexDirection="column"
              borderStyle={border}
              borderColor={colors.red}
              paddingX={1}
              marginTop={1}
            >
              <Text color={colors.red} bold>
                ⚠ Destructive operation
              </Text>
              <Text color={colors.yellow}>{plan.warning}</Text>
            </Box>
          )}

          {stage === "review" && (
            <Box marginTop={1}>
              <Text color={colors.text}>
                Run this? <Text color={colors.green}>[y]</Text>{" "}
                <Text color={colors.red}>[n]</Text>
              </Text>
            </Box>
          )}

          {stage === "result" && (
            <Box marginTop={1} flexDirection="column">
              {ran || !plan.destructive ? (
                <Text color={colors.green}>✔ Done — command executed.</Text>
              ) : (
                <Text color={colors.yellow}>✗ Cancelled — nothing was run.</Text>
              )}
              <Hint>Press r to ask something else.</Hint>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
