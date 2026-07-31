import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testRoot = mkdtempSync(join(tmpdir(), "commitron-demo-repo-test-"));
const demoRepository = join(testRoot, "generated-demo");
const projectRoot = process.cwd();
const sourceCli = join(projectRoot, "src", "cli.tsx");
let failures = 0;

function check(name: string, condition: boolean): void {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures += 1;
}

try {
  execFileSync(process.execPath, [
    "run",
    sourceCli,
    "demo",
    "prepare",
    demoRepository,
  ], {
    cwd: projectRoot,
    stdio: "ignore",
  });

  const initialStatus = git(["status", "--porcelain"]);
  check(
    "Demo generator prepares Ask state",
    initialStatus.includes("A  docs/cart-discounts.md") &&
      initialStatus.includes(" M src/cart.ts") &&
      initialStatus.includes("?? tests/cart-discount.test.ts"),
  );
  check(
    "Demo generator creates baseline history",
    git(["tag", "--list", "demo/base"]).trim() === "demo/base",
  );
  check(
    "Demo generator copies the canonical guide",
    existsSync(join(demoRepository, "DEMO_GUIDE.md")) &&
      readFileSync(join(demoRepository, "DEMO_GUIDE.md"), "utf8").includes(
        "Part 5 — Fix Error",
      ),
  );
  check(
    "Demo generator copies the presenter cheat sheet",
    existsSync(join(demoRepository, "DEMO_CHEATSHEET.md")) &&
      readFileSync(
        join(demoRepository, "DEMO_CHEATSHEET.md"),
        "utf8",
      ).includes("Keep this file open during the presentation"),
  );
  check(
    "Generated repository relies on the Commitron binary",
    !existsSync(
      join(demoRepository, ".commitron-demo", "scenario-runner.ts"),
    ) &&
      readFileSync(join(demoRepository, "package.json"), "utf8").includes(
        "commitron demo scenario",
      ),
  );

  scenario("commit");
  const commitStatus = git(["status", "--porcelain"]);
  check(
    "Commit scenario mixes repository-wide changes",
    commitStatus.includes("src/auth/otp.ts") &&
      commitStatus.includes("tests/auth.test.ts") &&
      commitStatus.includes("docs/security.md") &&
      commitStatus.includes("src/cart.ts"),
  );

  scenario("branch");
  check(
    "Branch scenario restores a clean main",
    git(["branch", "--show-current"]).trim() === "main" &&
      git(["status", "--porcelain"]).trim() === "",
  );

  scenario("explain");
  check(
    "Explain scenario includes staged and unstaged diffs",
    git(["diff", "--cached", "--name-only"]).includes("src/auth/session.ts") &&
      git(["diff", "--name-only"]).includes("docs/setup.md"),
  );

  scenario("fix-error");
  const rejectedPush = spawnSync("git", ["push"], {
    cwd: demoRepository,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  check(
    "Fix Error scenario creates a real offline push rejection",
    rejectedPush.status !== 0 &&
      /rejected|fetch first|non-fast-forward/i.test(
        `${rejectedPush.stdout}${rejectedPush.stderr}`,
      ),
  );

  const unsafeTarget = join(testRoot, "existing-project");
  mkdirSync(unsafeTarget);
  writeFileSync(join(unsafeTarget, "keep.txt"), "do not overwrite\n");
  const unsafeAttempt = spawnSync(process.execPath, [
    "run",
    sourceCli,
    "demo",
    "prepare",
    unsafeTarget,
  ], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  check(
    "Demo generator refuses non-empty directories",
    unsafeAttempt.status !== 0 &&
      /new or completely empty/.test(`${unsafeAttempt.stdout}${unsafeAttempt.stderr}`),
  );

  const emptyTarget = join(testRoot, "existing-empty-directory");
  mkdirSync(emptyTarget);
  const emptyTargetInode = statSync(emptyTarget).ino;
  prepare(emptyTarget);
  check(
    "Demo generator preserves an existing empty directory",
    statSync(emptyTarget).ino === emptyTargetInode &&
      existsSync(join(emptyTarget, "DEMO_GUIDE.md")),
  );
} finally {
  rmSync(testRoot, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} FAILED` : "\ndemo repository OK");
process.exit(failures ? 1 : 0);

function scenario(name: string): void {
  execFileSync(process.execPath, [
    "run",
    sourceCli,
    "demo",
    "scenario",
    name,
  ], {
    cwd: demoRepository,
    stdio: "ignore",
  });
}

function prepare(target: string): void {
  execFileSync(process.execPath, [
    "run",
    sourceCli,
    "demo",
    "prepare",
    target,
  ], {
    cwd: projectRoot,
    stdio: "ignore",
  });
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: demoRepository,
    encoding: "utf8",
  });
}
