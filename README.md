# Commitron

An AI-powered Git assistant with a safe presentation mode and incrementally growing
live features. Commitron can turn plain-English intent into Git plans, generate
commit messages, organize large changes into meaningful commit stacks, and create
those commits through an Ink terminal UI.

It starts in **demo mode**, where every feature uses deterministic mock data. In
**live mode**, every tool uses the current Git repository and a saved OpenAI API key.

Built with **Ink** (React for the terminal), TypeScript, and Bun.

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

Use **Setup** to save an OpenAI API key and switch to live mode. Settings are stored
in `~/.config/commitron/config.json` with owner-only permissions.

## Controls

- **↑ / ↓** — move through the menu / pickers
- **Enter** — open a tool / confirm a choice
- **Esc** — back to the home dashboard
- **q** — quit (from the home screen)

Commit-stack review also uses **e** to begin, **x** to exclude/include a file,
**m** to move a file to the next commit, and **b** to leave file editing.

## Features

| Menu | Demo mode | Live mode |
|------|-----------|-----------|
| **Ask** | Mock plan with a simulated confirmation flow | Repository-aware AI plan with policy-checked execution |
| **Commit** | Mock staged diff and commit result | Inventories all changes, proposes a semantic commit stack, and confirms each commit |
| **Branch** | Generates mock conventional branch names | Generates three validated names and creates the selected branch after confirmation |
| **Explain** | Summarizes a mock diff | Explains staged, unstaged, or all tracked changes |
| **Fix Error** | Decodes a predefined Git error | Diagnoses pasted failures and policy-checks every suggested recovery command |
| **Setup** | Saves mode, API key, model, and commit style | Same |

## Project layout

```
src/
├─ cli.tsx              entry point (renders the app)
├─ App.tsx              routing + global keys
├─ theme.ts             colors, gradients, the menu definition
├─ config.ts            demo/live resolution and persistent settings
├─ data/mock.ts         deterministic demo data
├─ services/            demo/live Git and OpenAI operations
├─ hooks/useFakeAI.ts   simulated "AI is thinking" delay
├─ components/          one file per screen + shared widgets
└─ __smoke__/nav.test.tsx  deterministic input/navigation test (bun run smoke)
```

## Verify the flows

```bash
bun run smoke   # drives keystrokes through the app and asserts each screen works
```

## Live-mode boundaries

Ask sends only the current branch, short status entries, and five recent commit
subjects to OpenAI. It does not send diffs or source contents. Explain sends the
selected tracked-file diff, capped at 50,000 characters; untracked file contents are
excluded. Branch sends the work description but validates names and collisions
locally. Fix Error sends only the command and error text pasted by the user.

Live Commit reads staged, unstaged, and untracked changes. It sends one tracked diff
excerpt or untracked text excerpt per OpenAI request, with each excerpt capped at
6,000 characters. Binary and recognized generated-file contents are not sent. Each
file is assigned locally as soon as its response arrives, so a later response
cannot omit earlier work. If one placement fails, Commitron groups that file
locally and continues. After two consecutive OpenAI failures it stops making API
requests and groups the remaining files locally. Up to 250 files are planned into
at most 12 whole-file commits; additional files remain uncommitted.

Before execution, files can be excluded or moved between proposed commits. Every
commit requires confirmation. The first confirmed commit reorganizes the index so
Commitron can stage one group at a time; working-tree content is preserved. If the
sequence is cancelled after some commits, completed commits remain and the rest of
the changes remain unstaged.

Read-only commands can run directly. Staging, branch switching/creation, staged
restore, and stash push require confirmation. Risky and unsupported plans remain
visible but must be run manually. Model output is always checked by local policy
before execution.
