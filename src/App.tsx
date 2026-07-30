import React, { useState } from "react";
import { useApp, useInput } from "ink";
import { Layout } from "./components/Layout.tsx";
import { HomeScreen } from "./components/HomeScreen.tsx";
import { AskScreen } from "./components/AskScreen.tsx";
import { CommitScreen } from "./components/CommitScreen.tsx";
import { BranchScreen } from "./components/BranchScreen.tsx";
import { ExplainScreen } from "./components/ExplainScreen.tsx";
import { ErrorHelperScreen } from "./components/ErrorHelperScreen.tsx";
import { InitScreen } from "./components/InitScreen.tsx";
import { loadConfig, type Mode } from "./config.ts";
import type { ScreenId } from "./theme.ts";

/** Maps each screen id to its component. Remounts on navigation via React key. */
const screens: Record<Exclude<ScreenId, "home">, React.ComponentType> = {
  ask: AskScreen,
  commit: CommitScreen,
  branch: BranchScreen,
  explain: ExplainScreen,
  error: ErrorHelperScreen,
  init: InitScreen,
};

/** Root: owns navigation state and global keys (Esc → home, q → quit). */
export function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<ScreenId>("home");
  const [mode, setMode] = useState<Mode>(() => loadConfig().mode);

  useInput((input, key) => {
    if (key.escape) {
      setMode(loadConfig().mode);
      setScreen("home");
    }
    // Only treat "q" as quit from the home screen, so it can be typed elsewhere.
    if (input === "q" && screen === "home") exit();
  });

  const footer =
    screen === "home"
      ? mode === "live"
        ? "↑↓ navigate · Enter open · all tools are live · q quit"
        : "↑↓ navigate · Enter open · q quit"
      : "Esc back to menu · q from home to quit";

  const Active = screen === "home" ? null : screens[screen];

  return (
    <Layout active={screen} mode={mode} footer={footer}>
      {screen === "home" ? (
        <HomeScreen mode={mode} onSelect={setScreen} />
      ) : (
        // key forces a fresh mount each time a screen opens (re-runs the fake AI).
        Active && <Active key={screen} />
      )}
    </Layout>
  );
}
