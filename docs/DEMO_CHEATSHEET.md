# Commitron presentation cheat sheet

Keep this file open during the presentation.

## Start the app

From the generated demo repository:

```bash
commitron
```

## 1. Ask

```bash
commitron demo scenario ask
```

Try these one at a time:

```text
show me what's changed
stage the cart source and test files
undo my last commit but keep the changes
```

Say:

> I can ask in normal English. Safe commands can run, changes need confirmation,
> and history-changing commands stay manual.

## 2. Commit

```bash
commitron demo scenario commit
```

Open **Commit** and review the proposed groups.

Say:

> Commitron turns many mixed file changes into a few clear, reviewable commits.

## 3. Branch

```bash
commitron demo scenario branch
```

Enter:

```text
add account recovery with one-time codes
```

Say:

> Commitron suggests short, valid branch names and asks before creating one.

## 4. Explain

```bash
commitron demo scenario explain
```

Choose **All tracked changes**.

Say:

> Commitron explains a difficult Git diff in normal language and reports risk.

## 5. Fix Error

```bash
commitron demo scenario fix-error
git push
```

Copy the failure. Open **Fix Error**, type `git push`, then paste the error.

Say:

> Git protected someone else's work. Commitron explains why and suggests guarded
> recovery steps.

## Finish

Say:

> Commitron makes Git easier to understand while keeping the developer in control.

## If something breaks

Close Commitron with Esc, then `q`. Run the current scenario command again.

Clean reset:

```bash
commitron demo reset
```
