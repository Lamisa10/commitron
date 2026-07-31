#!/usr/bin/env bun
import React from "react";
import { App } from "./App.tsx";
import { runCliCommand } from "./demo/commands.ts";
import { renderTui } from "./render-tui.tsx";

const commandExitCode = runCliCommand(process.argv.slice(2));
if (commandExitCode === null) {
  await renderTui(<App />);
} else {
  process.exitCode = commandExitCode;
}
