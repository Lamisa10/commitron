import beginnerGuide from "../../docs/DEMO.md" with { type: "text" };
import cheatSheet from "../../docs/DEMO_CHEATSHEET.md" with { type: "text" };

/** Markdown is embedded into the published binary by Bun's text loader. */
export const demoGuides = {
  "DEMO_GUIDE.md": beginnerGuide,
  "DEMO_CHEATSHEET.md": cheatSheet,
} as const;
