#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { App } from "./App.tsx";

// Enter the alternate screen buffer so the TUI takes over the terminal cleanly.
process.stdout.write("\x1b[?1049h");

// Bun's stdin doesn't enter flowing mode on its own the way Node's does, so Ink
// drops keypresses under Bun. Priming raw mode + resume() fixes input delivery.
// (Harmless under Node; Ink manages raw mode from here on.)
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

const { waitUntilExit } = render(<App />);

waitUntilExit().then(() => {
  // Restore the previous terminal contents on exit.
  process.stdout.write("\x1b[?1049l");
});
