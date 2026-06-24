# Commitron — TUI Prototype

A **visual prototype** of Commitron, the AI-Powered Git Commit & Branch Assistant
described in the project proposal. This is a clickable-feeling terminal UI built to
*show the idea* — it uses **dummy data and a simulated "AI"** (fake thinking delays,
mock diffs and messages). There are **no OpenAI calls and no real Git execution** yet.

Built with **Ink** (React for the terminal) on **TypeScript + Bun**, matching the
proposal's stack.

## Run it

```bash
bun install        # install dependencies

bun start          # launch the TUI (Bun runtime, per the proposal)
# or, if keys feel dropped in your terminal under Bun:
bun run start:node # identical app, run through Node (rock-solid terminal input)
```

> **Note on input:** Ink's keyboard handling is fully reliable under Node. Bun's
> stdin has had occasional key-drop issues with Ink; `src/cli.tsx` primes raw mode
> to work around it, and `start:node` is provided as a guaranteed-smooth fallback
> for live demos.

## Controls

- **↑ / ↓** — move through the menu / pickers
- **Enter** — open a tool / confirm a choice
- **Esc** — back to the home dashboard
- **q** — quit (from the home screen)

## Feature screens (all from the proposal)

| Menu | What it demonstrates |
|------|----------------------|
| **Ask** *(headline)* | Plain-English request → interpreted Git plan → **destructive ops are previewed and require confirmation** |
| **Commit** | Reads a (mock) staged diff → 3 Conventional-Commit candidates in a picker |
| **Branch** | Short description → kebab-case branch name (e.g. `feat/otp-login`) |
| **Explain** | Plain-English summary of the current diff |
| **Fix Error** | A failed `git push` decoded into a friendly explanation + fix |
| **Setup** | Guided config wizard (API key, model, commit style) |

## Project layout

```
src/
├─ cli.tsx              entry point (renders the app)
├─ App.tsx              routing + global keys
├─ theme.ts             colors, gradients, the menu definition
├─ data/mock.ts         ALL dummy data (diffs, commits, branches, errors)
├─ hooks/useFakeAI.ts   simulated "AI is thinking" delay
├─ components/          one file per screen + shared widgets
└─ __smoke__/nav.test.tsx  deterministic input/navigation test (bun run smoke)
```

## Verify the flows

```bash
bun run smoke   # drives keystrokes through the app and asserts each screen works
```

## What's intentionally NOT here

Real OpenAI integration, real Git command execution, config persistence — these are
the next step once the look-and-feel is approved. Everything visible is a faithful
mock of the proposed behavior.
