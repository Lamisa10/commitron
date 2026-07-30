import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageName = process.env.NPM_PACKAGE_NAME?.trim();
const token = process.env.NPM_TOKEN?.trim();

if (!packageName) {
  throw new Error(
    "Set NPM_PACKAGE_NAME first, for example @your-username/commitron.",
  );
}
if (!token) {
  throw new Error("Set NPM_TOKEN to an npm access token before publishing.");
}

const authDirectory = await mkdtemp(join(tmpdir(), "commitron-npm-"));
const userConfigPath = join(authDirectory, "npmrc");
try {
  await writeFile(
    userConfigPath,
    [
      "registry=https://registry.npmjs.org/",
      `//registry.npmjs.org/:_authToken=${token}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  const environment = { ...process.env };
  delete environment.NPM_TOKEN;
  environment.NPM_CONFIG_CACHE = join(authDirectory, "cache");
  environment.NPM_CONFIG_USERCONFIG = userConfigPath;
  await run(["bun", "run", "verify"], environment);
  await run(["bun", "run", "build:npm"], environment);
  await run(["npm", "pack", "--dry-run", "./dist/npm"], environment);
  await run(
    [
      "npm",
      "publish",
      "./dist/npm",
      "--access",
      "public",
    ],
    environment,
  );
} finally {
  await rm(authDirectory, { recursive: true, force: true });
}

async function run(
  command: string[],
  environment: Record<string, string | undefined> = process.env,
): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: resolveProjectRoot(),
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

function resolveProjectRoot(): string {
  return join(import.meta.dir, "..");
}
