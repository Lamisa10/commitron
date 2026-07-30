import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

interface SourcePackage {
  bugs?: { url: string };
  dependencies?: Record<string, string>;
  description: string;
  homepage?: string;
  license?: string;
  name: string;
  repository?: { type: string; url: string };
  version: string;
}

const projectRoot = resolve(import.meta.dir, "..");
const outputDirectory = join(projectRoot, "dist", "npm");
const sourcePackage = JSON.parse(
  await readFile(join(projectRoot, "package.json"), "utf8"),
) as SourcePackage;
const packageName =
  process.env.NPM_PACKAGE_NAME?.trim() || sourcePackage.name;

validatePackageName(packageName);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const build = await Bun.build({
  entrypoints: [join(projectRoot, "src", "cli.tsx")],
  outdir: outputDirectory,
  naming: "cli.js",
  target: "bun",
  format: "esm",
  packages: "external",
  sourcemap: "none",
});
if (!build.success) {
  for (const log of build.logs) console.error(log);
  throw new Error("Could not build the npm CLI package.");
}

const cliPath = join(outputDirectory, "cli.js");
const cliSource = await readFile(cliPath, "utf8");
const executableSource =
  "#!/usr/bin/env bun\n" + cliSource.replace(/^#![^\n]*\n/, "");
await writeFile(cliPath, executableSource, { mode: 0o755 });
await chmod(cliPath, 0o755);

await Promise.all([
  copyFile(join(projectRoot, "README.md"), join(outputDirectory, "README.md")),
  copyFile(join(projectRoot, "LICENSE"), join(outputDirectory, "LICENSE")),
]);

const publishPackage = {
  name: packageName,
  version: sourcePackage.version,
  description: sourcePackage.description,
  license: sourcePackage.license ?? "MIT",
  type: "module",
  bin: { commitron: "cli.js" },
  files: ["cli.js", "README.md", "LICENSE"],
  engines: { bun: ">=1.1.0" },
  dependencies: sourcePackage.dependencies ?? {},
  repository: sourcePackage.repository,
  homepage: sourcePackage.homepage,
  bugs: sourcePackage.bugs,
  keywords: [
    "git",
    "cli",
    "tui",
    "commit",
    "openai",
    "developer-tools",
  ],
  publishConfig: { access: "public" },
};
await writeFile(
  join(outputDirectory, "package.json"),
  JSON.stringify(publishPackage, null, 2) + "\n",
);

console.log(
  `Built ${packageName}@${sourcePackage.version} in ${outputDirectory}`,
);

function validatePackageName(value: string): void {
  const packageNamePattern =
    /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
  if (!packageNamePattern.test(value)) {
    throw new Error(
      `Invalid npm package name "${value}". Use a lowercase name such as @username/commitron.`,
    );
  }
}
