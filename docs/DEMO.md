# Commitron beginner presentation script

You do not need to be a Git expert to present Commitron. Follow this script from
top to bottom. Text under **Say** can be read aloud word for word.

AI responses may use slightly different words each time. That is normal. Look for
the same general result, not an exact sentence.

## What you are demonstrating

**Say:**

> Commitron is a terminal assistant for Git. I can describe what I want in normal
> English. It suggests the right Git commands, explains them, and stops dangerous
> commands from running automatically.

The demonstration uses a disposable project. It is safe to change, commit, reset,
or break this project.

## Prepare once before presentation day

Open a terminal in the Commitron source project and run:

```bash
bun run demo:prepare -- ../commitron-university-demo
cd ../commitron-university-demo
```

If `commitron` is installed globally, the app starts with:

```bash
commitron
```

If the terminal says `command not found`, use:

```bash
bun run /Users/tahsin/Workstation/lamisa-work/commitron/src/cli.tsx
```

### Turn on live mode

1. Start Commitron.
2. Use the down arrow to select **Setup**.
3. Press Enter.
4. Add the OpenAI API key if it is not already saved.
5. Choose `live` mode.
6. Press Esc to return home.

Do not show or read the complete API key to the audience.

**Say:**

> Live mode uses the project in my current folder and asks OpenAI for help. The
> API key is stored locally and displayed only in a shortened form.

## Part 1 — Ask

### Prepare

From the generated repository:

```bash
bun run demo:scenario ask
```

Start Commitron and open **Ask**.

### Example A: understand the project

Type:

```text
show me what's changed
```

Press Enter and wait.

**Expected:**

- Commitron shows what it understood.
- It shows a `git status` command.
- It explains that the command only reads information.
- It offers to run the safe command.

If you see **READY TO EXECUTE**, press `e`.

**Say:**

> I asked a normal question instead of remembering a Git command. Commitron chose
> a read-only command, explained it, and safely ran it inside the app.

### Example B: request a real action

Press `r` to ask another question. Type:

```text
stage the cart source and test files
```

Press Enter and wait. Press `e` to review execution. If Commitron asks for
confirmation, press `y`.

**Say:**

> Staging changes modifies the project, so Commitron asks me before doing it.
> Nothing important happens silently.

### Example C: show the safety limit

Press `r`, then type:

```text
undo my last commit but keep the changes
```

Press Enter and wait.

**Expected:** Commitron shows **MANUAL ONLY**.

**Say:**

> This command changes Git history. Commitron still teaches me the command, but it
> refuses to run it automatically. I remain responsible for risky actions.

Press Esc to return home, then `q` to close Commitron.

## Part 2 — Commit

### Prepare

```bash
bun run demo:scenario commit
```

Start Commitron and open **Commit**. Wait while it reads the files and proposes a
small set of commits.

The exact commit names and number of groups may change. That is normal.

**Expected:**

- Authentication files should usually be grouped together.
- Tests should stay near the feature they test.
- Cart and documentation changes may form separate groups.
- You can review which files belong to each commit.

**Say:**

> Developers often change many files before remembering to commit. Commitron looks
> at all those changes and suggests a few clear commits, as if the work had been
> committed carefully along the way.

You may stop after reviewing the suggestions. To demonstrate real commits, press
`e` and follow the confirmation prompts. Press `y` only when you want to create
the displayed commit.

**Say:**

> Commitron never creates the whole commit stack without review. I approve each
> commit separately.

Close Commitron with Esc, then `q`.

## Part 3 — Branch

### Prepare

```bash
bun run demo:scenario branch
```

Start Commitron, open **Branch**, and type:

```text
add account recovery with one-time codes
```

Press Enter, choose one suggested name, and press Enter again. Press `e`, then `y`
if Commitron asks for confirmation.

**Say:**

> Branch names should be short and consistent, but naming is surprisingly hard.
> Commitron turns my description into valid choices and asks before creating the
> branch.

Close Commitron with Esc, then `q`.

## Part 4 — Explain

### Prepare

```bash
bun run demo:scenario explain
```

Start Commitron and open **Explain**.

1. Select **All tracked changes**.
2. Press Enter.
3. Wait for the explanation.

**Expected:**

- A short overall summary
- A simple explanation for each changed file
- A low, medium, or high risk label

**Say:**

> A Git diff is useful but difficult to read. Commitron explains the same changes
> in normal language, file by file, and points out possible risk.

Press `r` if you want to choose **Staged changes** or **Unstaged changes** and show
the difference.

Close Commitron with Esc, then `q`.

## Part 5 — Fix Error

### Prepare a real error

Close Commitron and run:

```bash
bun run demo:scenario fix-error
git push
```

The push is supposed to fail. Copy the error text shown in the terminal. The
remote repository is local and offline; this does not contact GitHub.

Start Commitron and open **Fix Error**.

1. At `command ❯`, type `git push` and press Enter.
2. At `error ❯`, paste the copied error.
3. Press Enter and wait.

**Expected:**

- A simple explanation of what happened
- Suggested recovery commands
- A warning or **MANUAL ONLY** block for risky actions

**Say:**

> Git stopped the push because another copy of the project changed first. That
> protection prevents me from accidentally overwriting someone else's work.
> Commitron explains the problem and gives me recovery steps, but it still checks
> whether those steps are safe to run automatically.

## Closing statement

**Say:**

> Commitron does not replace Git or remove developer control. It makes Git easier
> to understand, helps organize work, and adds a safety layer between AI advice
> and real commands.

## Emergency recovery

If anything looks wrong, close Commitron with Esc and `q`, then prepare the current
part again:

```bash
bun run demo:scenario ask
bun run demo:scenario commit
bun run demo:scenario branch
bun run demo:scenario explain
bun run demo:scenario fix-error
```

To return to a completely clean project:

```bash
bun run demo:reset
```

These commands discard changes only inside this generated demo repository. They
first check the safety marker and confirm they are at the exact Git root.

## Common problems

### `commitron: command not found`

Use:

```bash
bun run /Users/tahsin/Workstation/lamisa-work/commitron/src/cli.tsx
```

### `Script not found "demo:scenario"`

You are probably in the wrong folder. Run:

```bash
pwd
ls -la
```

The folder should contain `package.json`, `.commitron-demo`, `src`, and
`DEMO_GUIDE.md`.

### The folder looks empty

Refresh the folder:

```bash
cd ..
cd commitron-university-demo
ls -la
```

### Commitron says `DEMO ONLY`

Open **Setup**, add the API key, and select `live` mode.

### An AI answer is different from this guide

That is expected. Explain that AI wording can vary. Check that the command is
reasonable and that Commitron displays the correct safety level.
