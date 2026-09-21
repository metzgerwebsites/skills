#!/usr/bin/env node
// Copies package.json's version into plugin manifests.
// Runs as part of `npm run version`, immediately after `changeset version`.
// With --check it changes nothing and exits 1 if any manifest version differs.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPaths = [
  join(repo, ".claude-plugin", "plugin.json"),
  join(repo, "kimi.plugin.json"),
];

const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const manifests = manifestPaths.map((manifestPath) => {
  const source = readFileSync(manifestPath, "utf8");
  const plugin = JSON.parse(source);
  return { manifestPath, source, plugin };
});
const outOfSync = manifests.filter(({ plugin }) => plugin.version !== version);

if (outOfSync.length === 0) {
  console.log(`plugin manifests are ${version} (already in sync)`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  for (const { manifestPath, plugin } of outOfSync) {
    console.error(
      `${relative(repo, manifestPath)} version is ${plugin.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\`.`,
    );
  }
  process.exit(1);
}

for (const { manifestPath, source, plugin } of outOfSync) {
  // Rewrite only the version line, to keep the key order and the formatting.
  const updated = source.replace(
    /("version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
  );

  if (JSON.parse(updated).version !== version) {
    console.error(`Could not find a version field to replace in ${manifestPath}.`);
    process.exit(1);
  }

  writeFileSync(manifestPath, updated);
  console.log(`${relative(repo, manifestPath)} version ${plugin.version} -> ${version}`);
}
