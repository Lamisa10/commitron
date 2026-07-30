# Commitron maintainer guide

This document contains the development, demonstration, publishing, and privacy
details kept out of the public-facing README.

## Runtime notes

Ink's keyboard handling is fully reliable under Node. Bun's stdin has had
occasional key-drop issues with Ink; `src/cli.tsx` primes raw mode to work around
it, and `bun run start:node` is provided as a fallback.

Use **Setup** to save an OpenAI API key and switch to live mode. Settings are
stored in `~/.config/commitron/config.json` with owner-only permissions.

## Real repository presentation

Generate a disposable Git repository, then run the real Commitron inside it:

```bash
bun run demo:prepare -- ../commitron-university-demo
cd ../commitron-university-demo

bun run demo:scenario ask
commitron

bun run demo:scenario commit
commitron
```

The generated repository includes `ask`, `commit`, `branch`, `explain`, and
`fix-error` checkpoints plus a `DEMO_GUIDE.md`. Each checkpoint resets only that
generated repository, then prepares real commits, branches, staged or unstaged
files, or a local non-fast-forward push failure. It never changes the Commitron
source repository or uses an internet remote.

Scenario resets use `git reset --hard` and `git clean` after verifying both a
Commitron demo safety marker and the exact repository root. The generator refuses
to use a non-empty directory.

## Additional controls

Commit-stack review uses:

- **e** — begin editing
- **x** — exclude or include a file
- **m** — move a file to the next commit
- **b** — leave file editing

## Project layout

```text
src/
├─ cli.tsx                 entry point
├─ App.tsx                 routing and global keys
├─ theme.ts               colors, gradients, and the menu
├─ config.ts              demo/live settings
├─ data/mock.ts           deterministic demo data
├─ services/              demo/live Git and OpenAI operations
├─ hooks/useFakeAI.ts     simulated AI delay
├─ components/            screens and shared widgets
└─ __smoke__/             deterministic interaction tests
```

## Verification

Run the smoke suite after changing screens, routing, or mock data:

```bash
bun run smoke
```

Run the complete type and smoke verification before publishing:

```bash
bun run verify
```

## Publishing to npm

The repository package is private so `npm publish` cannot accidentally publish
the source tree. The publishing workflow creates a clean Bun package in
`dist/npm`, verifies the app, previews the tarball, and publishes only that
staging directory.

Choose a package name after creating an npm account. A scope is recommended:

```bash
export NPM_PACKAGE_NAME="@your-npm-username/commitron"
read -s NPM_TOKEN
export NPM_TOKEN

bun run pack:npm
bun run publish:npm

unset NPM_TOKEN
```

`NPM_TOKEN` is written only to a temporary owner-only npm config during
publication and is removed afterward. Never put the token in this repository or
commit it.

After publication, users can install the scoped package globally while keeping
the short executable name:

```bash
npm install --global @your-npm-username/commitron
commitron
```

The npm package page renders the root `README.md`. Its logo uses an absolute
GitHub URL so it can be displayed on both GitHub and npm. npm refreshes the README
when a new package version is published.

## Live-mode boundaries

Ask sends only the current branch, short status entries, and five recent commit
subjects to OpenAI. It does not send diffs or source contents. Explain sends the
selected tracked-file diff, capped at 50,000 characters; untracked file contents
are excluded. Branch sends the work description but validates names and
collisions locally. Fix Error sends only the command and error text pasted by the
user.

Live Commit reads staged, unstaged, and untracked changes. It sends one tracked
diff excerpt or untracked text excerpt per OpenAI request, with each excerpt
capped at 6,000 characters. Binary and recognized generated-file contents are not
sent. Each file is assigned locally as soon as its response arrives, so a later
response cannot omit earlier work. If one placement fails, Commitron groups that
file locally and continues. After two consecutive OpenAI failures it stops making
API requests and groups the remaining files locally. Up to 250 files are planned
into at most 12 whole-file commits; additional files remain uncommitted.

Before execution, files can be excluded or moved between proposed commits. Every
commit requires confirmation. The first confirmed commit reorganizes the index
so Commitron can stage one group at a time; working-tree content is preserved. If
the sequence is cancelled after some commits, completed commits remain and the
rest of the changes remain unstaged.

Read-only commands can run directly. Staging, branch switching or creation,
staged restore, and stash push require confirmation. Risky and unsupported plans
remain visible but must be run manually. Model output is always checked by local
policy before execution.
