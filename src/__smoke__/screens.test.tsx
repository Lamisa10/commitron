import React from "react";
import { render } from "ink-testing-library";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BranchScreen } from "../components/BranchScreen.tsx";
import { ExplainScreen } from "../components/ExplainScreen.tsx";
import { ErrorHelperScreen } from "../components/ErrorHelperScreen.tsx";
import { InitScreen } from "../components/InitScreen.tsx";

// Redirect config writes to a throwaway file so the real config is untouched.
const TEST_CONFIG = join(tmpdir(), "commitron-test-config.json");
process.env.COMMITRON_CONFIG = TEST_CONFIG;

const ARROW_DOWN = "[B";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (n: string, c: boolean) => { console.log((c ? "PASS" : "FAIL") + "  " + n); if (!c) fail++; };

(async () => {
  {
    const { lastFrame, stdin, unmount } = render(<BranchScreen />);
    await wait(40); stdin.write("add login page with OTP"); await wait(30); stdin.write("\r");
    await wait(1600);
    check("Branch generates name", /feat\/otp-login/.test(lastFrame()!));
    check("Branch shows checkout cmd", /git checkout -b/.test(lastFrame()!));
    unmount();
  }
  {
    const { lastFrame, unmount } = render(<ExplainScreen />);
    await wait(1700);
    check("Explain shows summary", /one-time-password/.test(lastFrame()!));
    unmount();
  }
  {
    const { lastFrame, unmount } = render(<ErrorHelperScreen />);
    await wait(1700);
    check("Error shows friendly explanation", /What happened/.test(lastFrame()!));
    check("Error shows fix", /git pull --rebase/.test(lastFrame()!));
    unmount();
  }
  {
    const { lastFrame, stdin, unmount } = render(<InitScreen />);
    await wait(50);
    check("Setup lists current settings", /API key/.test(lastFrame()!) && /Model/.test(lastFrame()!));
    // Edit the API key (first row): Enter to open, type a key, Enter to save.
    stdin.write("\r"); await wait(30);
    stdin.write("sk-test-1234"); await wait(30);
    stdin.write("\r"); await wait(50);
    check("Setup masks the saved key", /sk-…1234/.test(lastFrame()!));
    // Edit the Model (second row): down to it, open, pick the next model.
    stdin.write(ARROW_DOWN); await wait(30);
    stdin.write("\r"); await wait(30);
    stdin.write(ARROW_DOWN); await wait(30);
    stdin.write("\r"); await wait(50);
    const saved = existsSync(TEST_CONFIG) ? JSON.parse(readFileSync(TEST_CONFIG, "utf8")) : {};
    check("Setup writes the key to config", saved.openaiKey === "sk-test-1234");
    check("Setup sets live mode on first key", saved.mode === "live");
    check("Setup updates the chosen model", saved.model === "gpt-4o");
    if (existsSync(TEST_CONFIG)) unlinkSync(TEST_CONFIG);
    unmount();
  }
  console.log(fail ? `\n${fail} FAILED` : "\nall screens OK");
  process.exit(fail ? 1 : 0);
})();
