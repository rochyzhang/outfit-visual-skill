import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

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
  "examples/clean-editorial-flat-lay.json",
  "examples/prop-styling.json",
  "examples/japanese-catalog.json",
  "examples/korean-street-editorial.json",
  "docs/INPUTS.md",
  "docs/WORKFLOW.md",
  "mcp/config.example.json"
];

const skillReferenceMapping = [
  ["01", "examples/visual/01-minimal-flat-lay.jpg"],
  ["02", "examples/visual/02-clean-editorial-flat-lay.png"],
  ["03", "examples/visual/03-look-breakdown.jpg"],
  ["04", "examples/visual/04-prop-styling.jpg"],
  ["05", "examples/visual/05-japanese-catalog.png"],
  ["06", "examples/visual/06-korean-street-editorial.jpg"]
] as const;

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

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
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

const skillReadme = safeRead(path.join(packageDir, "SKILL.md"));
assert.match(skillReadme, /only that Skill's own Reference image path may be used/i);
assert.match(skillReadme, /All other packaged visual examples are for gallery browsing, user selection, and documentation only/i);
assert.match(skillReadme, /For Use 01, explicitly ignore `02-clean-editorial-flat-lay\.png`/);
assert.match(skillReadme, /For Use 02, explicitly ignore `01-minimal-flat-lay\.jpg`/);
for (const [code, referencePath] of skillReferenceMapping) {
  assert.match(skillReadme, new RegExp(`${code} may use only \`${referencePath.replaceAll("/", "\\/")}\``));
  assert.ok(existsSync(path.join(packageDir, referencePath)), `Missing mapped visual reference: ${referencePath}`);
}
assert.equal(
  sha256(path.join(packageDir, "examples/visual/04-prop-styling.jpg")),
  "1C3C2D5CD6FB4A1C5CE01912AB9122B2F3A108418E0B7FA09BE935C15002BFE0",
  "SK04 packaged visual reference changed unexpectedly"
);
const sk02Contract = skillReadme.match(/### 02[\s\S]*?(?=### 03)/)?.[0] ?? "";
const sk02PositiveContract = sk02Contract
  .split(/\n/)
  .filter((line) => /^- (Composition|Scene|Look|Graphic) rule:/.test(line))
  .join("\n");
const sk01Contract = skillReadme.match(/### 01[\s\S]*?(?=### 02)/)?.[0] ?? "";
const sk04Contract = skillReadme.match(/### 04[\s\S]*?(?=### 05)/)?.[0] ?? "";
assert.doesNotMatch(
  sk02PositiveContract,
  /casual layered placement|mild overlap, rhythm|tactile concrete-floor still-life/,
  "SK02 must not borrow SK01 casual concrete flat-lay language"
);
assert.match(sk01Contract, /thin arrows or leader lines plus short English labels in Title Case/);
assert.match(sk01Contract, /Do not use all-caps for every product name/);
assert.match(sk02Contract, /restrained top title such as `OUTFIT NOTES`, `EDITED LOOK`, or `MONTHLY OUTFIT`/);
assert.match(sk02Contract, /do not copy reference-image brand names, website addresses, logos, months, or slogans/);
assert.match(sk04Contract, /Interpret the SK04 reference as a product display system/);
assert.match(sk04Contract, /chair-supported outfit display and garments arranged in natural wearing order on a display chair/);
assert.match(sk04Contract, /Human-referential reading is allowed only through garment order and outfit relationship, not body shape, human pose, or body posture/);
assert.match(sk04Contract, /Tops or inner tops may rest over the chair back, wrap lightly around chair edges, hang naturally from chair contact, or be supported by the chair while staying visibly empty/);
assert.match(sk04Contract, /If an outer garment exists, layer it naturally over or around the top, or drape it over the chair back or side/);
assert.match(sk04Contract, /Trousers must be laid or draped from the chair seat or seat edge/);
assert.match(sk04Contract, /folds created by fabric weight, denim stiffness, garment cut, gravity, chair contact, and natural bunching/);
assert.match(sk04Contract, /Natural garment volume is allowed; human anatomical volume is not/);
assert.match(sk04Contract, /must not form inflated thighs, hidden knee shapes, calf volume, rounded leg tubes/);
assert.match(sk04Contract, /Bags may hang from or rest against the chair as an independent product/);
assert.match(sk04Contract, /Shoes should stay product-like near the chair or lower composition area/);
assert.match(sk04Contract, /not positioned as invisible feet or forced into SK06 standing-pose logic/);
assert.match(sk04Contract, /soft even ambient studio light/);
assert.match(sk04Contract, /visible sunbeam, window-light streak, diagonal light patch/);
assert.match(sk04Contract, /one small top information row/);
const sk05Contract = skillReadme.match(/### 05[\s\S]*?(?=### 06)/)?.[0] ?? "";
const sk06Contract = skillReadme.match(/### 06[\s\S]*$/)?.[0] ?? "";
assert.match(sk05Contract, /limited short Japanese editorial accent text allowed/);
assert.match(sk05Contract, /Do not create a vertical column of multiple product zoom\/detail boxes/);
assert.match(sk06Contract, /clear standing human-pose silhouette/);
assert.match(sk06Contract, /wearing-order arrangement logic/);
assert.match(sk06Contract, /top or outer at the upper-body position/);
assert.match(sk06Contract, /bottom directly below with a believable waist-to-hem relationship/);
assert.match(sk06Contract, /shoes at the bottom as the end of the outfit/);
assert.match(sk06Contract, /bag placed as an accessory near the upper-body or shoulder side/);
assert.match(sk06Contract, /shoulder-to-hip relationship/);
assert.match(sk06Contract, /both shoe toes coordinated in one pose direction/);
assert.match(sk06Contract, /random flat-lay scattering/);
assert.match(sk06Contract, /standing invisible-person or worn-body presentation/);

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

