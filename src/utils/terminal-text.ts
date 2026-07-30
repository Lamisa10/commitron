const operatingSystemCommand =
  /\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g;
const controlSequence = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const shortEscape = /\u001B[@-_]/g;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Converts pasted terminal output into inert, readable text for Ink and OpenAI. */
export function sanitizeTerminalText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(operatingSystemCommand, "")
    .replace(controlSequence, "")
    .replace(shortEscape, "")
    .replace(unsafeControlCharacters, "")
    .replace(/\t/g, "  ");
}

/** Sanitizes a command and keeps it on one visual line. */
export function sanitizeTerminalLine(value: string): string {
  return sanitizeTerminalText(value).replace(/\n+/g, " ");
}
