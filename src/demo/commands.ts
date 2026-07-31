import { prepareDemoRepository } from "./prepare.ts";
import {
  demoScenarioList,
  isDemoScenario,
  resetDemoRepository,
  runDemoScenario,
} from "./repository.ts";

/** Handles non-interactive CLI commands. Returns null when the TUI should launch. */
export function runCliCommand(args: string[]): number | null {
  if (args.length === 0) return null;

  if (args[0] === "--help" || args[0] === "-h") {
    printGeneralHelp();
    return 0;
  }
  if (args[0] !== "demo") {
    console.error(`Unknown command: ${args.join(" ")}`);
    printGeneralHelp();
    return 1;
  }

  try {
    return runDemoCommand(args.slice(1));
  } catch (error) {
    console.error(
      `Commitron demo error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

function runDemoCommand(args: string[]): number {
  const [command, value, ...extra] = args;
  if (!command || command === "--help" || command === "-h") {
    printDemoHelp();
    return 0;
  }
  if (extra.length > 0) {
    console.error("Too many arguments.");
    printDemoHelp();
    return 1;
  }

  switch (command) {
    case "prepare":
      if (!value) {
        console.error("Choose where the new demo repository should be created.");
        console.error("Example: commitron demo prepare ../commitron-university-demo");
        return 1;
      }
      prepareDemoRepository(value);
      return 0;

    case "scenario":
      if (!value || !isDemoScenario(value)) {
        console.error(`Choose a scenario: ${demoScenarioList()}.`);
        return 1;
      }
      runDemoScenario(process.cwd(), value);
      return 0;

    case "reset":
      if (value) {
        console.error("The reset command does not accept another argument.");
        return 1;
      }
      resetDemoRepository(process.cwd());
      return 0;

    default:
      console.error(`Unknown demo command: ${command}`);
      printDemoHelp();
      return 1;
  }
}

function printGeneralHelp(): void {
  console.log(`Commitron — plain-English Git assistant

Usage:
  commitron                         Open the terminal app
  commitron demo --help             Show demo commands
  commitron demo prepare <path>     Create a real demo repository
  commitron demo scenario <name>    Prepare one demo scenario
  commitron demo reset              Restore the demo baseline`);
}

function printDemoHelp(): void {
  console.log(`Commitron real-repository demo

Create a repository:
  commitron demo prepare ../commitron-university-demo

From inside that repository:
  commitron demo scenario ask
  commitron demo scenario commit
  commitron demo scenario branch
  commitron demo scenario explain
  commitron demo scenario fix-error
  commitron demo reset
  commitron

Scenarios intentionally discard changes only after verifying the generated
repository's safety marker and exact Git root.`);
}
