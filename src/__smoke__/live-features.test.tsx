import React from "react";
import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BranchScreen } from "../components/BranchScreen.tsx";
import { ErrorDiagnosisView } from "../components/ErrorDiagnosisView.tsx";
import { ErrorHelperScreen } from "../components/ErrorHelperScreen.tsx";
import { ExplainScreen } from "../components/ExplainScreen.tsx";
import { ScrollViewport } from "../components/ScrollViewport.tsx";
import { getExplainableDiff } from "../services/git.ts";
import { sanitizeTerminalText } from "../utils/terminal-text.ts";

const ENTER = "\r";
const ESC = String.fromCharCode(27);
const PAGE_DOWN = `${ESC}[6~`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  let pass = 0;
  let fail = 0;
  const check = (name: string, condition: boolean) => {
    console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
    condition ? pass++ : fail++;
  };

  const sanitizedTerminalError = sanitizeTerminalText(
    "\u001B]0;git error\u0007remote denied\r\u001B[31mfatal: 403\u001B[0m\thttps://github.com/example/repository.git",
  );
  check(
    "Fix Error removes terminal control sequences",
    !/[\u001B\r\u0007]/.test(sanitizedTerminalError) &&
      sanitizedTerminalError.startsWith("remote denied\nfatal: 403"),
  );
  check(
    "Fix Error preserves readable URLs",
    sanitizedTerminalError.includes(
      "https://github.com/example/repository.git",
    ),
  );
  const unsafeErrorView = render(
    <ErrorDiagnosisView
      command="git push origin main"
      diagnosis={{
        summary: "GitHub rejected the push.",
        cause: "The authenticated account does not have repository access.",
        commands: [],
        cautions: [],
      }}
      errorOutput={
        "\u001B[31mremote denied\rfatal: unable to access " +
        "https://github.com/example/a-very-long-repository-name.git\u001B[0m"
      }
    />,
  );
  const safeErrorFrame = unsafeErrorView.lastFrame()!;
  check(
    "Fix Error keeps pasted output inside its frame",
    !/[\u001B\r]/.test(safeErrorFrame) &&
      safeErrorFrame.split("\n").every((line) => line.length <= 100),
  );
  unsafeErrorView.unmount();

  const scrollViewport = render(
    <ScrollViewport reservedRows={18}>
      <Box flexDirection="column">
        {Array.from({ length: 20 }, (_, index) => (
          <Text key={index}>
            VIEWPORT LINE {String(index + 1).padStart(2, "0")}
          </Text>
        ))}
      </Box>
    </ScrollViewport>,
  );
  await wait(50);
  const topViewportFrame = scrollViewport.lastFrame()!;
  check(
    "Scrollable viewport clips long results",
    topViewportFrame.includes("VIEWPORT LINE 01") &&
      !topViewportFrame.includes("VIEWPORT LINE 20") &&
      /lines 1–6 of 20/.test(topViewportFrame),
  );
  scrollViewport.stdin.write(PAGE_DOWN);
  await wait(30);
  check(
    "Scrollable viewport supports page navigation",
    scrollViewport.lastFrame() !== topViewportFrame,
  );
  scrollViewport.stdin.write("G");
  await wait(30);
  check(
    "Scrollable viewport jumps to the bottom",
    scrollViewport.lastFrame()!.includes("VIEWPORT LINE 20"),
  );
  scrollViewport.stdin.write("g");
  await wait(30);
  check(
    "Scrollable viewport jumps to the top",
    scrollViewport.lastFrame()!.includes("VIEWPORT LINE 01"),
  );
  scrollViewport.unmount();

  const originalWorkingDirectory = process.cwd();
  const repository = mkdtempSync(join(tmpdir(), "commitron-live-features-"));
  execFileSync("git", ["init", "-q"], { cwd: repository });
  writeFileSync(join(repository, "example.txt"), "safe staging test\n");
  execFileSync("git", ["add", "example.txt"], { cwd: repository });
  const configPath = join(repository, "config.json");
  writeFileSync(
    configPath,
    JSON.stringify({ mode: "live", openaiKey: "sk-test" }),
    { mode: 0o600 },
  );
  process.env.COMMITRON_MODE = "live";
  process.env.COMMITRON_CONFIG = configPath;
  process.chdir(repository);

  try {
    const stagedDiff = await getExplainableDiff("staged", "live");
    check("Explain reads staged tracked changes", stagedDiff.raw.includes("example.txt"));

    const branch = render(
      <BranchScreen
        suggestNames={async () => [
          "feat/live-tools",
          "feat/live-tooling",
          "chore/live-feature-tests",
        ]}
      />,
    );
    await wait(40);
    branch.stdin.write("implement live tools");
    await wait(30);
    branch.stdin.write(ENTER);
    await wait(100);
    check("Live Branch offers validated names", /feat\/live-tools/.test(branch.lastFrame()!));
    branch.stdin.write(ENTER);
    await wait(40);
    check("Live Branch shows confirmed creation", /READY TO EXECUTE/.test(branch.lastFrame()!));
    branch.stdin.write("e");
    await wait(40);
    check("Live Branch requires confirmation", /CONFIRM EXECUTION/.test(branch.lastFrame()!));
    branch.stdin.write("y");
    await wait(180);
    const createdBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: repository,
      encoding: "utf8",
    });
    check(
      "Live Branch creates the selected branch",
      /✔ Executed/.test(branch.lastFrame()!) &&
        createdBranch.trim() === "feat/live-tools",
    );
    branch.unmount();

    const explain = render(
      <ExplainScreen
        loadDiff={async (scope) => ({
          lines: [
            { type: "meta", text: "diff --git a/example.txt b/example.txt" },
            { type: "add", text: "+safe staging test" },
          ],
          raw: "diff --git a/example.txt b/example.txt\n+safe staging test",
          scope,
          truncated: false,
        })}
        summarize={async () => ({
          overview: "Adds a small example file.",
          files: [
            {
              path: "example.txt",
              explanation: "Adds one line used by the smoke test.",
            },
          ],
          riskLevel: "low",
          riskExplanation: "The change is isolated.",
        })}
      />,
    );
    await wait(40);
    explain.stdin.write(ENTER);
    await wait(100);
    const explainFrame = explain.lastFrame()!;
    check("Live Explain labels data sharing", /diff content is sent to OpenAI/.test(explainFrame));
    check("Live Explain summarizes a selected scope", /Adds a small example file/.test(explainFrame));
    check("Live Explain reports risk", /Risk: low/.test(explainFrame));
    explain.unmount();

    const errorHelper = render(
      <ErrorHelperScreen
        diagnose={async () => ({
          summary: "The remote branch has newer commits.",
          cause: "The push is not a fast-forward update.",
          commands: [{ args: ["pull", "--rebase", "origin", "main"] }],
          cautions: ["Resolve conflicts before pushing again."],
        })}
      />,
    );
    await wait(40);
    errorHelper.stdin.write("git push origin main");
    await wait(30);
    errorHelper.stdin.write(ENTER);
    await wait(40);
    errorHelper.stdin.write("rejected non-fast-forward");
    await wait(30);
    errorHelper.stdin.write(ENTER);
    await wait(150);
    errorHelper.stdin.write("g");
    await wait(30);
    let foundExplanation = false;
    let foundRecovery = false;
    let foundManualPolicy = false;
    for (let page = 0; page < 10; page += 1) {
      const frame = errorHelper.lastFrame()!;
      foundExplanation ||= /remote branch has newer commits/.test(frame);
      foundRecovery ||= /git pull --rebase origin main/.test(frame);
      foundManualPolicy ||= /MANUAL ONLY/.test(frame);
      errorHelper.stdin.write(PAGE_DOWN);
      await wait(20);
    }
    check("Live Fix Error explains pasted failures", foundExplanation);
    check("Live Fix Error shows recovery commands", foundRecovery);
    check("Live Fix Error keeps risky fixes manual", foundManualPolicy);
    errorHelper.unmount();
  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(repository, { recursive: true, force: true });
  }

  const nonGitDirectory = mkdtempSync(join(tmpdir(), "commitron-live-non-git-"));
  const nonGitConfig = join(nonGitDirectory, "config.json");
  writeFileSync(
    nonGitConfig,
    JSON.stringify({ mode: "live", openaiKey: "sk-test" }),
    { mode: 0o600 },
  );
  process.env.COMMITRON_CONFIG = nonGitConfig;
  process.chdir(nonGitDirectory);

  try {
    const branch = render(<BranchScreen />);
    await wait(40);
    branch.stdin.write("add account settings");
    await wait(30);
    branch.stdin.write(ENTER);
    await wait(120);
    check(
      "Live Branch identifies a non-Git folder",
      /Not a Git repository/.test(branch.lastFrame()!),
    );
    branch.unmount();

    const explain = render(<ExplainScreen />);
    await wait(40);
    explain.stdin.write(ENTER);
    await wait(120);
    check(
      "Live Explain identifies a non-Git folder",
      /Not a Git repository/.test(explain.lastFrame()!),
    );
    explain.unmount();
  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(nonGitDirectory, { recursive: true, force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
