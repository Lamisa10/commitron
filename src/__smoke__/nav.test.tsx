import React from "react";
import { render } from "ink-testing-library";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { App } from "../App.tsx";
import { CommitScreen } from "../components/CommitScreen.tsx";
import { HomeScreen } from "../components/HomeScreen.tsx";
import type { ScreenId } from "../theme.ts";

// This is a demo-flow test — force demo mode so it never depends on a real saved config.
process.env.COMMITRON_MODE = "demo";

const ESC = String.fromCharCode(27);
const ARROW_DOWN = ESC + "[B";
const ENTER = "\r";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  let pass = 0;
  let fail = 0;
  const check = (name: string, cond: boolean) => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
    cond ? pass++ : fail++;
  };

  // 1. Home renders with the menu + value prop.
  const { lastFrame, stdin, unmount } = render(<App />);
  await wait(60);
  check("home shows value prop", /Talk to Git in plain English/.test(lastFrame()!));
  check("home shows menu items", /Commit/.test(lastFrame()!) && /Branch/.test(lastFrame()!));
  check(
    "layout shows working directory",
    lastFrame()!.includes("⌂") && lastFrame()!.includes(basename(process.cwd())),
  );

  // 2. Enter opens the first item (Ask).
  stdin.write(ENTER);
  await wait(60);
  check("Enter opens Ask screen", /ask/.test(lastFrame()!));
  check("Ask identifies demo-only behavior", /DEMO ONLY.*no Git commands run/.test(lastFrame()!));

  // 3. Type a destructive request + submit -> fake AI -> review gate.
  stdin.write("undo my last commit");
  await wait(40);
  stdin.write(ENTER);
  await wait(1800);
  const askFrame = lastFrame()!;
  check("Ask shows interpreted command", /git reset --soft HEAD~1/.test(askFrame));
  check("Ask warns on destructive op", /Destructive operation/.test(askFrame));
  check("Ask presents confirm gate", /Run this/.test(askFrame));

  // 4. Confirm -> executed result.
  stdin.write("y");
  await wait(80);
  check("Ask confirms execution", /command executed/.test(lastFrame()!));

  // 5. Esc returns home, navigate to Commit (down once) and open it.
  stdin.write(ESC);
  await wait(60);
  check("Esc returns home", /Talk to Git in plain English/.test(lastFrame()!));
  stdin.write(ARROW_DOWN);
  await wait(40);
  stdin.write(ENTER);
  await wait(1800);
  const commitFrame = lastFrame()!;
  check("Commit shows staged diff", /verifyOtp/.test(commitFrame));
  check("Commit offers candidates", /feat\(auth\)/.test(commitFrame));

  unmount();

  // 6. Live mode keeps demo tools visible but only selects implemented features.
  let selectedLiveScreen: ScreenId | null = null;
  const liveHome = render(
    <HomeScreen mode="live" onSelect={(id) => { selectedLiveScreen = id; }} />,
  );
  await wait(40);
  const liveHomeFrame = liveHome.lastFrame()!;
  check("Live home labels demo-only tools", /Ask\s+DEMO ONLY/.test(liveHomeFrame));
  check("Live home initially selects Commit", /›\s+✎\s+Commit/.test(liveHomeFrame));
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Commit", selectedLiveScreen === "commit");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home skips disabled tools", selectedLiveScreen === "init");
  liveHome.unmount();

  // 7. Live Commit presents a concise error when launched outside a Git repository.
  const originalWorkingDirectory = process.cwd();
  const nonGitDirectory = mkdtempSync(join(tmpdir(), "commitron-non-git-"));
  const testConfigPath = join(nonGitDirectory, "config.json");
  writeFileSync(
    testConfigPath,
    JSON.stringify({ mode: "live", openaiKey: "sk-test" }),
    { mode: 0o600 },
  );

  process.env.COMMITRON_MODE = "live";
  process.env.COMMITRON_CONFIG = testConfigPath;
  process.chdir(nonGitDirectory);

  try {
    const liveCommit = render(<CommitScreen />);
    await wait(120);
    const liveErrorFrame = liveCommit.lastFrame()!;
    check("Live Commit identifies a non-Git folder", /Not a Git repository/.test(liveErrorFrame));
    check("Live Commit suggests the next step", /git init/.test(liveErrorFrame));
    check("Live Commit hides raw Git help", !/usage: git diff/.test(liveErrorFrame));
    liveCommit.unmount();
  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(nonGitDirectory, { recursive: true, force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
