import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { loadConfig } from "../config.ts";
import {
  executeCommitStackItem,
  getChangeInventory,
} from "../services/commit-stack.ts";
import { planCommitStack } from "../services/commit-planner.ts";
import { colors } from "../theme.ts";
import { CommitStackScreen } from "./CommitStackScreen.tsx";
import { ScreenTitle } from "./Layout.tsx";
import { SingleCommitFlow } from "./SingleCommitFlow.tsx";
import { FeatureModeNotice } from "./shared.tsx";

interface CommitScreenProps {
  executeItem?: typeof executeCommitStackItem;
  loadInventory?: typeof getChangeInventory;
  planStack?: typeof planCommitStack;
}

/** Routes demo to its single mock commit and live mode to semantic stack planning. */
export function CommitScreen({
  executeItem,
  loadInventory,
  planStack,
}: CommitScreenProps = {}) {
  const cfg = useMemo(() => loadConfig(), []);

  return (
    <Box flexDirection="column">
      <ScreenTitle
        icon="✎"
        title="Commit"
        subtitle={
          cfg.mode === "live"
            ? "Turn repository-wide changes into a reviewed, meaningful commit stack."
            : "Conventional-Commit messages generated from your staged diff."
        }
      />

      {cfg.requestedMode === "live" && !cfg.hasKey ? (
        <Text color={colors.yellow}>
          ⚠ No API key saved — open Setup to add one. Running in demo mode.
        </Text>
      ) : null}

      {cfg.mode === "live" ? (
        <>
          <FeatureModeNotice
            mode={cfg.mode}
            liveText="Each changed file is planned separately; failed placements fall back locally"
            demoText=""
          />
          <CommitStackScreen
            cfg={cfg}
            executeItem={executeItem}
            loadInventory={loadInventory}
            planStack={planStack}
          />
        </>
      ) : (
        <SingleCommitFlow cfg={cfg} />
      )}
    </Box>
  );
}
