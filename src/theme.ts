/**
 * Central design tokens for Commitron's neon-on-dark aesthetic.
 * Keeping every color/gradient in one place makes the look easy to retune.
 */

export const colors = {
  // Brand accents
  cyan: "#22d3ee",
  magenta: "#e879f9",
  violet: "#a78bfa",
  blue: "#60a5fa",

  // Semantic
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
  orange: "#fb923c",

  // Neutrals
  text: "#e5e7eb",
  dim: "#9ca3af",
  faint: "#6b7280",
} as const;

/** Gradient presets passed to <Gradient name="..."> or custom color arrays. */
export const gradients = {
  brand: ["#22d3ee", "#a78bfa", "#e879f9"], // cyan → violet → magenta
  success: ["#34d399", "#22d3ee"],
  warn: ["#fbbf24", "#fb923c"],
} as const;

/** Border style used across framed panels. */
export const border = "round" as const;

/** A single source of truth for the feature menu. */
export type ScreenId =
  | "home"
  | "ask"
  | "commit"
  | "branch"
  | "explain"
  | "error"
  | "init";

export interface MenuItem {
  id: ScreenId;
  icon: string;
  label: string;
  hint: string;
}

export const menu: MenuItem[] = [
  { id: "ask", icon: "✦", label: "Ask", hint: "Plain-English Git commands" },
  { id: "commit", icon: "✎", label: "Commit", hint: "AI commit messages" },
  { id: "branch", icon: "⌥", label: "Branch", hint: "Generate branch names" },
  { id: "explain", icon: "❖", label: "Explain", hint: "Summarize a diff" },
  { id: "error", icon: "⚠", label: "Fix Error", hint: "Decode Git errors" },
  { id: "init", icon: "⚙", label: "Setup", hint: "Configure Commitron" },
];
