import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const scenarioNames = [
  "ask",
  "commit",
  "branch",
  "explain",
  "fix-error",
] as const;

export type ScenarioName = (typeof scenarioNames)[number];

export const scenarioNotes: Record<ScenarioName, string> = {
  ask: "Open Ask and try repository questions, staging requests, and a risky reset request.",
  commit: "Open Commit to organize the mixed repository-wide work into meaningful commits.",
  branch: "Open Branch and describe an account-recovery feature.",
  explain: "Open Explain and compare the staged, unstaged, and combined tracked diffs.",
  "fix-error": "Run `git push`, then paste its real rejection into Fix Error.",
};

export function prepareScenario(root: string, scenario: ScenarioName): void {
  switch (scenario) {
    case "ask":
      prepareAsk(root);
      return;
    case "commit":
      prepareCommit(root);
      return;
    case "branch":
      return;
    case "explain":
      prepareExplain(root);
      return;
    case "fix-error":
      prepareFixError(root);
  }
}

function prepareAsk(root: string): void {
  write(
    root,
    "src/cart.ts",
    [
      "export interface CartItem {",
      "  price: number;",
      "  quantity: number;",
      "}",
      "",
      "export function calculateCartTotal(items: CartItem[], discount = 0): number {",
      "  const subtotal = items.reduce(",
      "    (total, item) => total + item.price * item.quantity,",
      "    0,",
      "  );",
      "  return Math.max(0, subtotal - discount);",
      "}",
      "",
    ],
  );
  write(
    root,
    "docs/cart-discounts.md",
    ["# Cart discounts", "", "Discounts are subtracted after the cart subtotal is calculated.", ""],
  );
  write(
    root,
    "tests/cart-discount.test.ts",
    [
      'import { expect, test } from "bun:test";',
      'import { calculateCartTotal } from "../src/cart.ts";',
      "",
      'test("applies a fixed discount", () => {',
      "  expect(calculateCartTotal([{ price: 20, quantity: 2 }], 5)).toBe(35);",
      "});",
      "",
    ],
  );
  git(root, ["add", "docs/cart-discounts.md"]);
}

function prepareCommit(root: string): void {
  write(
    root,
    "src/auth/session.ts",
    [
      "export interface Session {",
      "  email: string;",
      "  createdAt: Date;",
      "  verifiedWithOtp: boolean;",
      "}",
      "",
      "export function createSession(email: string, verifiedWithOtp = false): Session {",
      "  return { email, createdAt: new Date(), verifiedWithOtp };",
      "}",
      "",
    ],
  );
  write(
    root,
    "src/auth/otp.ts",
    [
      "const activeCodes = new Map<string, string>();",
      "",
      "export function saveOtp(email: string, code: string): void {",
      "  activeCodes.set(email, code);",
      "}",
      "",
      "export function verifyOtp(email: string, code: string): boolean {",
      "  return activeCodes.get(email) === code;",
      "}",
      "",
    ],
  );
  write(
    root,
    "tests/auth.test.ts",
    [
      'import { expect, test } from "bun:test";',
      'import { saveOtp, verifyOtp } from "../src/auth/otp.ts";',
      "",
      'test("verifies the current OTP", () => {',
      '  saveOtp("student@example.com", "123456");',
      '  expect(verifyOtp("student@example.com", "123456")).toBe(true);',
      "});",
      "",
    ],
  );
  write(
    root,
    "src/cart.ts",
    [
      "export interface CartItem {",
      "  price: number;",
      "  quantity: number;",
      "}",
      "",
      "export function calculateCartTotal(items: CartItem[]): number {",
      "  return items.reduce(",
      "    (total, item) => total + item.price * Math.max(0, item.quantity),",
      "    0,",
      "  );",
      "}",
      "",
    ],
  );
  write(
    root,
    "docs/security.md",
    ["# Authentication security", "", "One-time codes are checked before a session is issued.", ""],
  );
  write(
    root,
    "README.md",
    [
      "# OTP Store",
      "",
      "A TypeScript storefront with OTP authentication and guarded cart totals.",
      "",
      "Run the test suite with `bun test`.",
      "",
    ],
  );
  git(root, ["add", "src/auth/session.ts", "src/auth/otp.ts", "tests/auth.test.ts"]);
}

function prepareExplain(root: string): void {
  write(
    root,
    "src/auth/session.ts",
    [
      "export interface Session {",
      "  email: string;",
      "  createdAt: Date;",
      "  expiresAt: Date;",
      "}",
      "",
      "export function createSession(email: string): Session {",
      "  const createdAt = new Date();",
      "  const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);",
      "  return { email, createdAt, expiresAt };",
      "}",
      "",
    ],
  );
  write(
    root,
    "src/index.ts",
    [
      'export { calculateCartTotal } from "./cart.ts";',
      'export { createSession, type Session } from "./auth/session.ts";',
      "",
    ],
  );
  write(
    root,
    "docs/setup.md",
    [
      "# Local setup",
      "",
      "Install Bun, run `bun test`, and use a short-lived development session.",
      "",
      "Production sessions expire after thirty minutes.",
      "",
    ],
  );
  git(root, ["add", "src/auth/session.ts", "src/index.ts"]);
}

function prepareFixError(root: string): void {
  const runtime = join(root, ".commitron-demo", "runtime");
  const remote = join(runtime, "remote.git");
  const collaborator = join(runtime, "collaborator");
  mkdirSync(runtime, { recursive: true });

  git(root, ["init", "--bare", remote]);
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "-u", "origin", "main"]);
  git(remote, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(root, ["clone", remote, collaborator]);
  git(collaborator, ["config", "user.name", "Demo Collaborator"]);
  git(collaborator, ["config", "user.email", "collaborator@example.com"]);
  write(
    collaborator,
    "README.md",
    [
      "# OTP Store",
      "",
      "A small TypeScript storefront with updated setup notes from a collaborator.",
      "",
    ],
  );
  git(collaborator, ["add", "README.md"]);
  git(collaborator, ["commit", "-m", "docs: update collaborator setup notes"]);
  git(collaborator, ["push", "origin", "main"]);

  write(
    root,
    "src/cart.ts",
    [
      "export interface CartItem {",
      "  price: number;",
      "  quantity: number;",
      "}",
      "",
      "export function calculateCartTotal(items: CartItem[]): number {",
      "  return Number(items.reduce(",
      "    (total, item) => total + item.price * item.quantity,",
      "    0,",
      "  ).toFixed(2));",
      "}",
      "",
    ],
  );
  git(root, ["add", "src/cart.ts"]);
  git(root, ["commit", "-m", "fix(cart): round totals to currency precision"]);
}

function write(root: string, relativePath: string, lines: string[]): void {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join("\n")}\n`);
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}
