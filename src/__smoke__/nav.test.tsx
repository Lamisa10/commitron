import React from "react";
import { render } from "ink-testing-library";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { App } from "../App.tsx";
import { AskScreen } from "../components/AskScreen.tsx";
import { CommitScreen } from "../components/CommitScreen.tsx";
import { HomeScreen } from "../components/HomeScreen.tsx";
import { executeGitPlan } from "../services/git-execution.ts";
import { getPlanExecutionPolicy } from "../services/git-policy.ts";
import { getRepositoryContext } from "../services/git.ts";
import type { ScreenId } from "../theme.ts";
import { normalizeTerminalFrame } from "./terminal-frame.ts";

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
  const homeFrame = normalizeTerminalFrame(lastFrame());
  check("home shows value prop", /Talk to Git in plain English/.test(homeFrame));
  check("home shows menu items", /Commit/.test(homeFrame) && /Branch/.test(homeFrame));
  check(
    "layout shows working directory",
    homeFrame.includes("⌂") && homeFrame.includes(basename(process.cwd())),
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
  check(
    "Ask confirms execution",
    /command executed/.test(normalizeTerminalFrame(lastFrame())),
  );

  // 5. Esc returns home, navigate to Commit (down once) and open it.
  stdin.write(ESC);
  await wait(60);
  check(
    "Esc returns home",
    /Talk to Git in plain English/.test(normalizeTerminalFrame(lastFrame())),
  );
  stdin.write(ARROW_DOWN);
  await wait(40);
  stdin.write(ENTER);
  await wait(1800);
  const commitFrame = lastFrame()!;
  check("Commit shows staged diff", /verifyOtp/.test(commitFrame));
  check("Commit offers candidates", /feat\(auth\)/.test(commitFrame));

  unmount();

  // 6. Every menu tool is implemented and selectable in live mode.
  let selectedLiveScreen: ScreenId | null = null;
  const liveHome = render(
    <HomeScreen mode="live" onSelect={(id) => { selectedLiveScreen = id; }} />,
  );
  await wait(40);
  const liveHomeFrame = normalizeTerminalFrame(liveHome.lastFrame());
  check("Live home exposes every tool", !/DEMO ONLY/.test(liveHomeFrame));
  check("Live home initially selects Ask", /›\s+✦\s+Ask/.test(liveHomeFrame));
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Ask", selectedLiveScreen === "ask");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Commit", selectedLiveScreen === "commit");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Branch", selectedLiveScreen === "branch");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Explain", selectedLiveScreen === "explain");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Fix Error", selectedLiveScreen === "error");
  liveHome.stdin.write(ARROW_DOWN);
  await wait(30);
  liveHome.stdin.write(ENTER);
  await wait(30);
  check("Live home opens Setup", selectedLiveScreen === "init");
  liveHome.unmount();

  // 7. Repository context stays minimal and excludes source contents.
  const repositoryContext = await getRepositoryContext("live");
  check("Live context includes the current branch", Boolean(repositoryContext.branch));
  check("Live context limits recent commit subjects", repositoryContext.recentCommits.length <= 5);
  check("Live context limits status entries", repositoryContext.status.length <= 41);

  // 8. Execution policy runs safe commands, confirms mutations, and blocks risky plans.
  check(
    "Execution policy allows read-only status",
    getPlanExecutionPolicy([{ args: ["status", "--short"] }]).level === "read-only",
  );
  check(
    "Execution policy confirms staging changes",
    getPlanExecutionPolicy([{ args: ["add", "example.txt"] }]).level === "confirm",
  );
  check(
    "Execution policy blocks risky reset",
    getPlanExecutionPolicy([{ args: ["reset", "--hard", "HEAD~1"] }]).level === "manual",
  );
  check(
    "Execution policy blocks unsupported switch options",
    getPlanExecutionPolicy([{ args: ["switch", "--discard-changes", "main"] }]).level === "manual",
  );

  const readResults = await executeGitPlan(
    [{ args: ["status", "--short", "--branch"] }],
    false,
  );
  check("Read-only plan executes in-app", readResults.length === 1);

  const originalWorkingDirectory = process.cwd();
  const executionRepo = mkdtempSync(join(tmpdir(), "commitron-execution-"));
  execFileSync("git", ["init", "-q"], { cwd: executionRepo });
  writeFileSync(join(executionRepo, "example.txt"), "safe staging test\n");
  process.chdir(executionRepo);

  try {
    let confirmationRequired = false;
    try {
      await executeGitPlan([{ args: ["add", "example.txt"] }], false);
    } catch (error) {
      confirmationRequired =
        error instanceof Error && /explicit confirmation/.test(error.message);
    }
    check("Mutation cannot bypass confirmation", confirmationRequired);

    await executeGitPlan([{ args: ["add", "example.txt"] }], true);
    const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: executionRepo,
      encoding: "utf8",
    });
    check("Confirmed staging plan executes", stagedFiles.trim() === "example.txt");

    let riskyPlanBlocked = false;
    try {
      await executeGitPlan([{ args: ["reset", "--hard"] }], true);
    } catch (error) {
      riskyPlanBlocked =
        error instanceof Error && /won't execute/.test(error.message);
    }
    check("Risky plan stays manual-only", riskyPlanBlocked);

    const executionConfig = join(executionRepo, "commitron-test-config.json");
    writeFileSync(
      executionConfig,
      JSON.stringify({ mode: "live", openaiKey: "sk-test" }),
      { mode: 0o600 },
    );
    process.env.COMMITRON_MODE = "live";
    process.env.COMMITRON_CONFIG = executionConfig;

    const executableAsk = render(
      <AskScreen
        generatePlan={async () => ({
          intent: "Show repository status",
          destructive: false,
          explanation: "Reads the current repository state.",
          commands: [{ args: ["status", "--short"] }],
        })}
      />,
    );
    await wait(40);
    executableAsk.stdin.write("show status");
    await wait(30);
    executableAsk.stdin.write(ENTER);
    await wait(120);
    check("Live Ask offers approved execution", /READY TO EXECUTE/.test(executableAsk.lastFrame()!));
    executableAsk.stdin.write("e");
    await wait(180);
    check("Live Ask executes a read-only plan", /✔ Executed/.test(executableAsk.lastFrame()!));
    executableAsk.unmount();

    const confirmedAsk = render(
      <AskScreen
        generatePlan={async () => ({
          intent: "Stage example.txt",
          destructive: false,
          explanation: "Adds the file to the staging area.",
          commands: [{ args: ["add", "example.txt"] }],
        })}
      />,
    );
    await wait(40);
    confirmedAsk.stdin.write("stage example.txt");
    await wait(30);
    confirmedAsk.stdin.write(ENTER);
    await wait(120);
    confirmedAsk.stdin.write("e");
    await wait(40);
    check("Live Ask confirms mutations", /CONFIRM EXECUTION/.test(confirmedAsk.lastFrame()!));
    confirmedAsk.stdin.write("n");
    await wait(40);
    check("Live Ask can cancel execution", /READY TO EXECUTE/.test(confirmedAsk.lastFrame()!));
    confirmedAsk.unmount();

    const riskyAsk = render(
      <AskScreen
        generatePlan={async () => ({
          intent: "Discard local changes",
          destructive: true,
          explanation: "Resets tracked files to the current commit.",
          commands: [{ args: ["reset", "--hard", "HEAD"] }],
          warning: "This discards local tracked changes.",
        })}
      />,
    );
    await wait(40);
    riskyAsk.stdin.write("discard my changes");
    await wait(30);
    riskyAsk.stdin.write(ENTER);
    await wait(120);
    const riskyAskFrame = riskyAsk.lastFrame()!;
    check("Live Ask marks risky plans manual-only", /MANUAL ONLY/.test(riskyAskFrame));
    check("Live Ask directs risky execution to the user", /run it yourself/.test(riskyAskFrame));
    riskyAsk.stdin.write("e");
    await wait(40);
    check("Risky Ask plan remains blocked", /MANUAL ONLY/.test(riskyAsk.lastFrame()!));
    riskyAsk.unmount();

  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(executionRepo, { recursive: true, force: true });
  }

  // 9. Live screens present concise errors outside a Git repository.
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

    const liveAsk = render(<AskScreen />);
    await wait(40);
    check("Live Ask identifies approved execution", /LIVE ASK.*approved commands can run/.test(liveAsk.lastFrame()!));
    liveAsk.stdin.write("show my status");
    await wait(30);
    liveAsk.stdin.write(ENTER);
    await wait(120);
    const liveAskErrorFrame = liveAsk.lastFrame()!;
    check("Live Ask identifies a non-Git folder", /Not a Git repository/.test(liveAskErrorFrame));
    check("Live Ask suggests the next step", /git init/.test(liveAskErrorFrame));
    liveAsk.unmount();

  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(nonGitDirectory, { recursive: true, force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
