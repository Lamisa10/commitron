import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "commitron-npm-pack-"),
);

try {
  await run(["bun", "run", "build:npm"], process.env);
  await run(["npm", "pack", "--dry-run", "./dist/npm"], {
    ...process.env,
    NPM_CONFIG_CACHE: join(temporaryDirectory, "cache"),
  });
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function run(
  command: string[],
  environment: Record<string, string | undefined>,
): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: projectRoot,
    env: environment,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${command.join(" ")}`);
  }
}
