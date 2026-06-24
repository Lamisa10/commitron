import React from "react";
import { render } from "ink-testing-library";
import { BranchScreen } from "../components/BranchScreen.tsx";
import { ExplainScreen } from "../components/ExplainScreen.tsx";
import { ErrorHelperScreen } from "../components/ErrorHelperScreen.tsx";
import { InitScreen } from "../components/InitScreen.tsx";

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
    await wait(40); stdin.write("sk-test-1234"); await wait(20); stdin.write("\r");
    await wait(40); stdin.write("\r");
    await wait(40); stdin.write("\r");
    await wait(60);
    check("Setup completes", /Commitron is ready/.test(lastFrame()!));
    check("Setup masks key", /sk-…1234/.test(lastFrame()!));
    unmount();
  }
  console.log(fail ? `\n${fail} FAILED` : "\nall screens OK");
  process.exit(fail ? 1 : 0);
})();
