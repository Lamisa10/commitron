import { spawnSync } from "node:child_process";

const smokeFiles = [
  "src/__smoke__/nav.test.tsx",
  "src/__smoke__/live-features.test.tsx",
  "src/__smoke__/commit-stack.test.tsx",
  "src/__smoke__/screens.test.tsx",
];

for (const file of smokeFiles) {
  const result = spawnSync(process.execPath, ["run", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
