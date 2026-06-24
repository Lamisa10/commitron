import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export type Mode = "demo" | "live";

/** Shape of the config file (every field optional). */
interface ConfigFile {
  mode?: Mode;
  model?: string;
  commitStyle?: string;
  openaiKey?: string;
}

export interface Config {
  /** The mode the app actually runs in — falls back to "demo" when no key is present. */
  mode: Mode;
  /** The mode that was requested (before fallback), so the UI can explain a fallback. */
  requestedMode: Mode;
  model: string;
  commitStyle: string;
  /** Resolved OpenAI key (env first, then the config file). Undefined when not set. */
  apiKey?: string;
  /** Convenience flag: whether a key was found anywhere. */
  hasKey: boolean;
}

const defaults = {
  model: "gpt-4o-mini",
  commitStyle: "Conventional Commits",
};

/**
 * Path to the config file: $XDG_CONFIG_HOME/commitron/config.json (or ~/.config/…).
 * Resolved lazily (not at import time) so tests can point COMMITRON_CONFIG at a
 * throwaway file before any read/write happens.
 */
function configPath(): string {
  if (process.env.COMMITRON_CONFIG) return process.env.COMMITRON_CONFIG;
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "commitron", "config.json");
}

/** Reads and parses the config file, or returns {} if it's missing/unreadable/invalid. */
function readStored(): ConfigFile {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as ConfigFile;
  } catch {
    return {}; // No config yet — defaults are fine.
  }
}

/**
 * Resolves the effective config: the stored file merged over defaults. Live mode
 * requires BOTH an explicit request (config file or COMMITRON_MODE=live) AND a key,
 * otherwise it falls back to demo so nothing can surprise a presentation.
 */
export function loadConfig(): Config {
  const file = readStored();

  // COMMITRON_MODE overrides the config file; useful for `COMMITRON_MODE=live bun start`.
  const envMode = process.env.COMMITRON_MODE;
  const requestedMode: Mode =
    envMode === "live" || envMode === "demo"
      ? envMode
      : file.mode === "live"
        ? "live"
        : "demo";

  // Key lookup order: environment first, then the saved config.
  const apiKey = process.env.OPENAI_API_KEY?.trim() || file.openaiKey?.trim() || undefined;
  const hasKey = Boolean(apiKey);
  const mode: Mode = requestedMode === "live" && hasKey ? "live" : "demo";

  return {
    mode,
    requestedMode,
    model: file.model ?? defaults.model,
    commitStyle: file.commitStyle ?? defaults.commitStyle,
    apiKey,
    hasKey,
  };
}

/**
 * Merges `update` into the config file and writes it back as pretty JSON with
 * owner-only permissions (the file may hold an API key). Creates the directory
 * (e.g. ~/.config/commitron) if it doesn't exist yet.
 */
export function saveConfig(update: ConfigFile): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  const merged = { ...readStored(), ...update };
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600); // ensure perms even if the file already existed
}
