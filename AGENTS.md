# AGENTS.md — Commitron

An AI-powered Git helper. Beginners (and pros) describe what they want in plain
English, and Commitron turns it into the right Git command — warning first if it's
risky — plus writes commit messages, names branches, explains diffs, and decodes
Git errors.

Cross-platform CLI: runs anywhere **Bun** runs — Linux, macOS, Windows.

## Status: prototype, growing real features

The app runs in two **modes**, decided once by `loadConfig()`:

- **demo** (default) — mock data, no API calls, no real Git. Safe for presentations.
- **live** — real `git` + real OpenAI. Requires `mode: "live"` in config *and* a key.

We're building features for real one at a time, behind a service seam so demo never
breaks. **Commit** is wired up live; the rest are still demo-only.

When adding to a feature, assume it goes through the services (below) and works in
both modes. Flag it if a request implies real execution in a screen that's still mock.

## Stack

Ink 5 (React for the terminal) + React 18, TypeScript (strict, ESM), on Bun.

## Run

```bash
bun install
bun start          # launch the TUI
bun run start:node # same app via Node — use if keys feel dropped under Bun
bun run smoke      # drive keystrokes through the app and check each screen
```

Run `smoke` after changing screens, routing, or mock data, and keep it passing.

## Layout

```
src/
├─ cli.tsx        entry point
├─ App.tsx        routing + global keys (Esc → home, q → quit)
├─ config.ts      loadConfig() → mode (demo/live), model, commit style
├─ theme.ts       all colors/gradients + the menu + ScreenId type
├─ data/mock.ts   all dummy data (used by demo mode)
├─ services/      git.ts, ai.ts — each function has a demo path + a live path
├─ hooks/         useFakeAI — the fake "thinking" delay (demo)
├─ components/    Layout, Banner, shared widgets, one *Screen.tsx per feature
└─ __smoke__/     keystroke-driven tests
```

## Modes & config

- `config.ts` owns all of this: `loadConfig()` (read) and `saveConfig()` (write).
- Config file: `$XDG_CONFIG_HOME/commitron/config.json` (default `~/.config/commitron/`),
  not in the repo. Holds `mode`, `model`, `commitStyle`, and `openaiKey`.
- **The API key lives only in the config file** (`openaiKey`). The Setup screen writes it
  there (dir auto-created, `chmod 600`). No `.env` / no `OPENAI_API_KEY` env var.
- Live needs both a `live` request (config or `COMMITRON_MODE=live`) and a saved key;
  otherwise it falls back to demo. Works the same under `bun start` and `start:node`.
- `COMMITRON_CONFIG` overrides the config-file path — tests set it to a temp file so they
  never touch the real config. Smoke tests run in demo.

## Conventions

- Styling comes from `theme.ts` — don't hardcode colors in components.
- Fake data lives in `data/mock.ts` — don't inline mock strings in screens.
- One small, single-responsibility component per screen; reuse `shared.tsx` widgets.
- Screens call **services** (`services/*.ts`), never `git`/OpenAI directly. The service
  branches on `mode`, so a screen looks the same in demo and live.
- **New screen** = add to `ScreenId` + `menu` (theme.ts), make `XScreen.tsx`,
  register it in `App.tsx`, add a smoke check.
- Imports use explicit `.ts`/`.tsx` extensions.

## Working agreement

Discuss the plan (2–3 options) before non-trivial changes; trivial fixes can go
straight in. Keep it simple and readable. We build feature by feature.
