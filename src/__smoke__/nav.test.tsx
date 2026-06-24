import React from "react";
import { render } from "ink-testing-library";
import { App } from "../App.tsx";

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

  // 2. Enter opens the first item (Ask).
  stdin.write(ENTER);
  await wait(60);
  check("Enter opens Ask screen", /ask/.test(lastFrame()!));

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
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
