import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageDir = path.join(root, "release", "red-skill", "outfit-visual-skill");
const zipPath = path.join(root, "release", "red-skill", "outfit-visual-skill.zip");
const maxFileBytes = 10 * 1024 * 1024;
const maxPackageBytes = 30 * 1024 * 1024;

const requiredRootFiles = ["README.md", "LICENSE", ".gitignore", ".env.example"];
const requiredPackageFiles = [
  "SKILL.md",
  "README.md",
  "skill-manifest.json",
  "examples/minimal-flat-lay.json",
  "examples/invisible-editorial.json",
  "examples/japanese-catalog.json",
  "docs/INPUTS.md",
  "docs/WORKFLOW.md",
  "mcp/config.example.json"
];

const requiredIgnorePatterns = [
  ".env",
  ".env.local",
  "node_modules/",
  ".next/",
  "storage/assets/*",
  "storage/generated/*",
  "storage/uploads/*",
  "data/*.db",
  "data/secrets/*"
];

const disallowedPackagePathParts = [
  "node_modules",
  ".next",
  "data",
  "storage",
  ".env",
  ".git",
  "out",
  "dist",
  "build"
];

const forbiddenContentPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /OPENAI_API_KEY[ \t]*=[ \t]*[^\r\n\s]+/,
  /Authorization/i,
  /[A-Z]:[\\/]+Users[\\/]+/i,
  /\/Users\/[^/\s]+/i,
  /D:[\\/]+Users[\\/]+/i,
  /C:[\\/]+Users[\\/]+/i,
  /data[\\/]secrets/i,
  /storage[\\/]generated/i,
  /storage[\\/]uploads/i,
  /rawProviderPayload/i
];

function walkFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return [fullPath];
  });
}

function relativeToPackage(filePath: string) {
  return path.relative(packageDir, filePath).replaceAll(path.sep, "/");
}

function safeRead(filePath: string) {
  return readFileSync(filePath, "utf8");
}

for (const file of requiredRootFiles) {
  assert.ok(existsSync(path.join(root, file)), `Missing root release file: ${file}`);
}

assert.ok(existsSync(packageDir), "Missing Red Skill package directory.");
for (const file of requiredPackageFiles) {
  assert.ok(existsSync(path.join(packageDir, file)), `Missing Red Skill package file: ${file}`);
}

const gitignore = safeRead(path.join(root, ".gitignore"));
for (const pattern of requiredIgnorePatterns) {
  assert.ok(gitignore.includes(pattern), `.gitignore is missing required protection: ${pattern}`);
}

const envExample = safeRead(path.join(root, ".env.example"));
assert.doesNotMatch(envExample, /sk-[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(envExample, /OPENAI_API_KEY[ \t]*=[ \t]*[^\r\n\s]+/);

const packageFiles = walkFiles(packageDir);
let totalBytes = 0;
for (const filePath of packageFiles) {
  const relative = relativeToPackage(filePath);
  const normalizedParts = relative.split("/");
  assert.ok(
    !normalizedParts.some((part) => disallowedPackagePathParts.includes(part)),
    `Red Skill package contains disallowed path: ${relative}`
  );

  const size = statSync(filePath).size;
  totalBytes += size;
  assert.ok(size <= maxFileBytes, `Red Skill file exceeds 10MB: ${relative}`);

  const text = safeRead(filePath);
  for (const pattern of forbiddenContentPatterns) {
    assert.doesNotMatch(text, pattern, `Red Skill file failed privacy check: ${relative}`);
  }
}

assert.ok(totalBytes <= maxPackageBytes, "Red Skill package exceeds 30MB.");
assert.ok(existsSync(zipPath), "Missing Red Skill ZIP artifact.");
assert.ok(statSync(zipPath).size <= maxPackageBytes, "Red Skill ZIP exceeds 30MB.");

const zipListing = execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replaceAll("'", "''")}').Entries | ForEach-Object { $_.FullName }`
])
  .toString("utf8")
  .replaceAll("\\", "/");

for (const file of requiredPackageFiles) {
  assert.ok(zipListing.includes(file), `ZIP is missing expected file: ${file}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      packageFiles: packageFiles.length,
      packageBytes: totalBytes,
      zipBytes: statSync(zipPath).size
    },
    null,
    2
  )
);

