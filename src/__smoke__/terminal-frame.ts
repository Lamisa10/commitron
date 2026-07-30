import { sanitizeTerminalText } from "../utils/terminal-text.ts";

/** Makes Ink snapshots comparable whether the test runs in a color TTY or CI. */
export function normalizeTerminalFrame(frame: string | undefined): string {
  return sanitizeTerminalText(frame ?? "");
}
