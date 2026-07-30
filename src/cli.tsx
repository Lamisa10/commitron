#!/usr/bin/env bun
import React from "react";
import { App } from "./App.tsx";
import { renderTui } from "./render-tui.tsx";

await renderTui(<App />);
