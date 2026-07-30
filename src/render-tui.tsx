import type React from "react";
import { render } from "ink";

/** Runs an Ink app in the alternate terminal buffer and always restores it. */
export async function renderTui(element: React.ReactElement): Promise<void> {
  process.stdout.write("\x1b[?1049h");

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  try {
    const { waitUntilExit } = render(element);
    await waitUntilExit();
  } finally {
    process.stdout.write("\x1b[?1049l");
  }
}
