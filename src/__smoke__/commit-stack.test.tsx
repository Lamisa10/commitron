import React from "react";
import { render } from "ink-testing-library";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { CommitScreen } from "../components/CommitScreen.tsx";
import {
  executeCommitStackItem,
  getChangeInventory,
} from "../services/commit-stack.ts";
import { planCommitStack } from "../services/commit-planner.ts";
import type {
  ChangeInventory,
  CommitStackItem,
  CommitStackPlan,
} from "../types/commit-stack.ts";

const ENTER = "\r";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  let pass = 0;
  let fail = 0;
  const check = (name: string, condition: boolean) => {
    console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
    condition ? pass++ : fail++;
  };

  const originalWorkingDirectory = process.cwd();
  const repository = mkdtempSync(join(tmpdir(), "commitron-stack-"));
  const configPath = join(
    tmpdir(),
    `${basename(repository)}-commitron-config.json`,
  );
  writeFileSync(
    configPath,
    JSON.stringify({ mode: "live", openaiKey: "sk-test" }),
    { mode: 0o600 },
  );
  process.env.COMMITRON_MODE = "live";
  process.env.COMMITRON_CONFIG = configPath;

  execFileSync("git", ["init", "-q"], { cwd: repository });
  execFileSync("git", ["config", "user.name", "Commitron Test"], {
    cwd: repository,
  });
  execFileSync("git", ["config", "user.email", "commitron@example.test"], {
    cwd: repository,
  });
  writeFileSync(join(repository, "first.txt"), "base\n");
  writeFileSync(join(repository, "second.txt"), "base\n");
  execFileSync("git", ["add", "."], { cwd: repository });
  execFileSync("git", ["commit", "-q", "-m", "chore: initial"], {
    cwd: repository,
  });
  writeFileSync(join(repository, "first.txt"), "base\nfirst change\n");
  writeFileSync(join(repository, "second.txt"), "base\nsecond change\n");
  process.chdir(repository);

  try {
    const inventory = await getChangeInventory("live");
    check("Stack inventory includes unstaged files", inventory.files.length === 2);
    check(
      "Stack inventory records full-file paths",
      inventory.files.some((file) => file.path === "first.txt") &&
        inventory.files.some((file) => file.path === "second.txt"),
    );

    const firstItem = stackItem("feat: commit first change", ["first.txt"]);
    const secondItem = stackItem("feat: commit second change", ["second.txt"]);
    const firstResult = await executeCommitStackItem(
      firstItem,
      inventory.fingerprint,
      true,
      "live",
    );
    const secondResult = await executeCommitStackItem(
      secondItem,
      inventory.fingerprint,
      false,
      "live",
    );
    const subjects = execFileSync("git", ["log", "-2", "--pretty=%s"], {
      cwd: repository,
      encoding: "utf8",
    });
    check(
      "Stack executor creates commits in order",
      firstResult.subject === firstItem.subject &&
        secondResult.subject === secondItem.subject &&
        subjects.startsWith(`${secondItem.subject}\n${firstItem.subject}`),
    );
    check(
      "Stack executor leaves committed work clean",
      execFileSync("git", ["status", "--porcelain"], {
        cwd: repository,
        encoding: "utf8",
      }).trim() === "",
    );

    appendFileSync(join(repository, "first.txt"), "planned\n");
    const staleInventory = await getChangeInventory("live");
    appendFileSync(join(repository, "first.txt"), "changed after planning\n");
    let stalePlanBlocked = false;
    try {
      await executeCommitStackItem(
        stackItem("test: stale plan", ["first.txt"]),
        staleInventory.fingerprint,
        true,
        "live",
      );
    } catch (error) {
      stalePlanBlocked =
        error instanceof Error && /moved after planning/.test(error.message);
    }
    check("Stack executor blocks stale plans", stalePlanBlocked);

    const fakeInventory = inventoryFixture();
    const placementResponses: unknown[] = [
      {
        targetCommit: -1,
        insertBefore: 0,
        subject: "feat: add the first logical change",
        body: "Implement the first part of the feature.",
        rationale: "This starts one cohesive feature commit.",
        mixedReason: null,
      },
      {
        targetCommit: 0,
        insertBefore: -1,
        subject: "feat: add the complete logical change",
        body: "Implement both related parts of the feature.",
        rationale: "Both files implement the same cohesive feature.",
        mixedReason: null,
      },
    ];
    let placementRequestCount = 0;
    const progressUpdates: string[] = [];
    const rollingPlan = await planCommitStack(
      fakeInventory,
      liveConfig(),
      {
        requestObject: async () => {
          placementRequestCount += 1;
          return placementResponses.shift();
        },
        onProgress: (completed, total) => {
          progressUpdates.push(`${completed}/${total}`);
        },
      },
    );
    check(
      "Stack planner assigns every file incrementally",
      rollingPlan.commits.length === 1 &&
        rollingPlan.commits[0].files.join(",") === "first.txt,second.txt",
    );
    check(
      "Stack planner makes one request per file",
      placementRequestCount === 2,
    );
    check(
      "Stack planner reports per-file progress",
      progressUpdates.join(",") === "1/2,2/2",
    );

    const fallbackInventory = inventoryWithPaths([
      "src/services/first.ts",
      "src/services/second.ts",
      "src/components/third.tsx",
      "README.md",
    ]);
    let failedRequestCount = 0;
    const fallbackPlan = await planCommitStack(
      fallbackInventory,
      liveConfig(),
      {
        requestObject: async () => {
          failedRequestCount += 1;
          throw new Error("OpenAI unavailable");
        },
      },
    );
    check(
      "Stack planner falls back without losing files",
      fallbackPlan.commits.flatMap((commit) => commit.files).length === 4 &&
        /4 files used local fallback/.test(fallbackPlan.warnings.join(" ")),
    );
    check(
      "Stack planner stops repeated failing requests",
      failedRequestCount === 2 &&
        /placement stopped/.test(fallbackPlan.warnings.join(" ")),
    );

    const fakePlan = planFixture();
    const executed: CommitStackItem[] = [];
    const editableScreen = render(
      <CommitScreen
        loadInventory={async () => fakeInventory}
        planStack={async () => fakePlan}
        executeItem={async (item) => {
          executed.push(item);
          return {
            files: item.files,
            hash: "abc123",
            subject: item.subject,
            summary: `${item.files.length} file changed`,
          };
        }}
      />,
    );
    await wait(80);
    check("Live Commit shows a semantic stack", /Proposed stack · 2 commits/.test(editableScreen.lastFrame()!));
    editableScreen.stdin.write(ENTER);
    await wait(30);
    editableScreen.stdin.write("x");
    await wait(30);
    editableScreen.stdin.write("b");
    await wait(30);
    editableScreen.stdin.write("e");
    await wait(30);
    check("Live Commit excludes files before execution", /CONFIRM COMMIT 1\/1/.test(editableScreen.lastFrame()!));
    editableScreen.stdin.write("y");
    await wait(80);
    check(
      "Live Commit executes only included files",
      /Commit stack complete/.test(editableScreen.lastFrame()!) &&
        executed.length === 1 &&
        executed[0].files[0] === "second.txt",
    );
    editableScreen.unmount();

    let confirmedCount = 0;
    const confirmedScreen = render(
      <CommitScreen
        loadInventory={async () => fakeInventory}
        planStack={async () => fakePlan}
        executeItem={async (item) => {
          confirmedCount += 1;
          return {
            files: item.files,
            hash: `hash${confirmedCount}`,
            subject: item.subject,
            summary: "1 file changed",
          };
        }}
      />,
    );
    await wait(80);
    confirmedScreen.stdin.write("e");
    await wait(30);
    check("Live Commit confirms the first commit", /CONFIRM COMMIT 1\/2/.test(confirmedScreen.lastFrame()!));
    confirmedScreen.stdin.write("y");
    await wait(80);
    check("Live Commit confirms every commit", /CONFIRM COMMIT 2\/2/.test(confirmedScreen.lastFrame()!));
    confirmedScreen.stdin.write("n");
    await wait(30);
    check(
      "Live Commit can stop between commits",
      /1 commits were created/.test(confirmedScreen.lastFrame()!) &&
        confirmedCount === 1,
    );
    confirmedScreen.unmount();
  } finally {
    process.chdir(originalWorkingDirectory);
    rmSync(repository, { recursive: true, force: true });
    rmSync(configPath, { force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function stackItem(subject: string, files: string[]): CommitStackItem {
  return {
    subject,
    body: "A focused test commit.",
    rationale: "Keeps one logical change together.",
    files,
    mixedFiles: [],
  };
}

function inventoryFixture(): ChangeInventory {
  return {
    branch: "main",
    fingerprint: "fixture",
    omittedFileCount: 0,
    files: [
      {
        binary: false,
        excerpt: "+first",
        generated: false,
        kind: "modified",
        path: "first.txt",
        staged: false,
        truncated: false,
        unstaged: true,
        untracked: false,
      },
      {
        binary: false,
        excerpt: "+second",
        generated: false,
        kind: "modified",
        path: "second.txt",
        staged: false,
        truncated: false,
        unstaged: true,
        untracked: false,
      },
    ],
  };
}

function liveConfig() {
  return {
    mode: "live" as const,
    requestedMode: "live" as const,
    model: "test-model",
    commitStyle: "Conventional Commits",
    apiKey: "sk-test",
    hasKey: true,
  };
}

function inventoryWithPaths(paths: string[]): ChangeInventory {
  return {
    branch: "main",
    fingerprint: "many-files",
    omittedFileCount: 0,
    files: paths.map((path) => ({
      binary: false,
      excerpt: `+change in ${path}`,
      generated: false,
      kind: "modified",
      path,
      staged: false,
      truncated: false,
      unstaged: true,
      untracked: false,
    })),
  };
}

function planFixture(): CommitStackPlan {
  return {
    commits: [
      stackItem("feat: first logical change", ["first.txt"]),
      stackItem("test: second logical change", ["second.txt"]),
    ],
    warnings: [],
  };
}

run();
