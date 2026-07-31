<p align="center">
  <img
    src="https://raw.githubusercontent.com/Lamisa10/commitron/main/assets/commitron-logo.png"
    alt="Commitron logo"
    width="240"
  />
</p>

<h1 align="center">Commitron</h1>

<p align="center">
  <strong>Talk to Git in plain English.</strong>
</p>

<p align="center">
  An AI-powered terminal assistant that makes Git easier to understand and safer to use.
</p>

## What is Commitron?

Commitron helps you work with Git without memorizing every command. Tell it what
you want to do, and it can suggest the right command, explain what will happen,
and warn you before a risky action.

It runs as an interactive terminal app built with Ink, React, TypeScript, and Bun.

## What can it do?

- **Ask** — describe a Git task in everyday language and get a safe command plan.
- **Commit** — review your changes, organize them into meaningful commits, and
  generate clear commit messages.
- **Branch** — turn a short description into clean, conventional branch names.
- **Explain** — understand staged or unstaged changes without reading a raw diff.
- **Fix Error** — paste a Git error and get a straightforward explanation and
  suggested recovery steps.

## Safe by default

Commitron has two modes:

- **Demo mode** uses prepared examples. It does not run real Git commands or call
  OpenAI, so it is safe for learning and presentations.
- **Live mode** works with your current Git repository and a saved OpenAI API key.
  Commitron asks for confirmation before actions that change your repository.

Live support is being added feature by feature while demo mode remains stable.

## Try it

You need [Bun](https://bun.sh/) installed.

Install Commitron from npm:

```bash
npm install --global @lamisin/commitron
commitron
```

Or run it from the source:

```bash
git clone https://github.com/Lamisa10/commitron.git
cd commitron
bun install
bun start
```

Commitron starts in demo mode. Open **Setup** inside the app when you are ready to
save an OpenAI API key and enable live mode.

If terminal input is unreliable under Bun, use:

```bash
bun run start:node
```

## University presentation

Generate a disposable Git repository containing repeatable live scenarios:

```bash
commitron demo prepare ../commitron-university-demo
cd ../commitron-university-demo
```

See the beginner-friendly [presentation script](docs/DEMO.md) for the complete
walkthrough and the [one-page cheat sheet](docs/DEMO_CHEATSHEET.md) for use during
the live presentation. The generator copies both files into every new demo
repository.

## Controls

- **↑ / ↓** — move through menus
- **Enter** — select or confirm
- **Esc** — return to the home screen
- **q** — quit from the home screen

## For contributors

See the
[maintainer guide](https://github.com/Lamisa10/commitron/blob/main/docs/maintainers.md)
for the project structure, demo scenarios, verification commands, npm publishing,
and live-mode privacy boundaries.

## License

[MIT](LICENSE)
