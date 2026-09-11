#!/usr/bin/env node
import { mkdir, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const valueArg = (name, fallback = "") => {
  const prefix = `${name}=`;
  const item = argv.find(entry => entry.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
};
const apply = argv.includes("--apply");
const deleteSource = argv.includes("--delete-source");
const root = path.resolve(valueArg("--root", process.cwd()));
const assetsRoot = path.join(root, "assets");
const quality = Math.max(70, Math.min(96, Number(valueArg("--quality", "88")) || 88));
const concurrency = Math.max(1, Math.min(8, Number(valueArg("--concurrency", "4")) || 4));
const sourceExtensions = new Set([".png", ".jpg", ".jpeg"]);

async function listSources(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const out = [];
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith(".") || entry.name.startsWith("._") || entry.name === "__MACOSX") continue;
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await listSources(absolute, relative));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) out.push({ absolute, relative });
  }
  return out;
}

function execFile(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorText = "";
    child.stderr.on("data", chunk => { errorText += String(chunk || ""); });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${errorText.slice(0, 500)}`)));
  });
}

let sharpModule = null;
async function getSharp() {
  if (sharpModule !== null) return sharpModule || null;
  try {
    const loaded = await import("sharp");
    sharpModule = loaded.default || loaded;
  } catch {
    sharpModule = false;
  }
  return sharpModule || null;
}

let imagemagickCommand = "";
async function getImagemagickCommand() {
  if (imagemagickCommand) return imagemagickCommand;
  for (const candidate of ["magick", "convert"]) {
    try {
      await execFile(candidate, ["-version"]);
      imagemagickCommand = candidate;
      return candidate;
    } catch {}
  }
  return "";
}

async function encodeWebp(source, output) {
  const sharp = await getSharp();
  if (sharp) {
    await sharp(source, { animated: true, limitInputPixels: false })
      .webp({ quality, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(output);
    return "sharp";
  }
  const magick = await getImagemagickCommand();
  if (magick) {
    const args = [source, "-quality", String(quality), "-define", "webp:method=6", output];
    await execFile(magick, args);
    return magick;
  }
  throw new Error("Не найден WebP encoder. Установите npm-пакет sharp или ImageMagick и запустите снова.");
}

async function validWebp(file) {
  try {
    const data = await readFile(file);
    return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  } catch {
    return false;
  }
}

function human(bytes) {
  const n = Math.max(0, Number(bytes || 0));
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const sources = await listSources(assetsRoot);
const collisions = new Map();
for (const item of sources) {
  const key = item.relative.replace(/\.(?:png|jpe?g)$/i, ".webp").toLowerCase();
  if (!collisions.has(key)) collisions.set(key, []);
  collisions.get(key).push(item.relative);
}
const collisionKeys = new Set([...collisions].filter(([, values]) => values.length > 1).map(([key]) => key));

let originalBytes = 0;
let webpBytes = 0;
let converted = 0;
let removed = 0;
let skipped = 0;
let failed = 0;
let encoderName = "";

async function processOne(item) {
  const sourceInfo = await stat(item.absolute);
  originalBytes += sourceInfo.size;
  const outputRelative = item.relative.replace(/\.(?:png|jpe?g)$/i, ".webp");
  const collisionKey = outputRelative.toLowerCase();
  if (collisionKeys.has(collisionKey)) {
    failed += 1;
    console.error(`COLLISION ${outputRelative}: ${collisions.get(collisionKey).join(", ")}`);
    return;
  }

  const output = path.join(assetsRoot, ...outputRelative.split("/"));
  const temp = output.replace(/\.webp$/i, `.zefirok-tmp-${process.pid}.webp`);
  await mkdir(path.dirname(output), { recursive: true });
  try {
    // IMPORTANT: encode every file. Do not use `encoderName || await encodeWebp(...)` here:
    // once encoderName becomes truthy, short-circuit evaluation would skip the encoder entirely.
    const usedEncoder = await encodeWebp(item.absolute, temp);
    if (!encoderName) encoderName = usedEncoder;

    if (!(await validWebp(temp))) throw new Error("encoder создал некорректный WebP");
    const tempInfo = await stat(temp);
    let chosenBytes = tempInfo.size;
    let useExisting = false;
    if (await validWebp(output)) {
      const existingInfo = await stat(output);
      if (existingInfo.size > 0 && existingInfo.size <= tempInfo.size) {
        chosenBytes = existingInfo.size;
        useExisting = true;
      }
    }

    webpBytes += chosenBytes;
    const saving = sourceInfo.size > 0 ? (1 - chosenBytes / sourceInfo.size) * 100 : 0;
    const marker = apply ? "WEBP" : "DRY";
    console.log(`${marker} ${item.relative} -> ${outputRelative} | ${human(sourceInfo.size)} -> ${human(chosenBytes)} (${saving.toFixed(1)}%)${useExisting ? " existing" : ""}`);

    if (apply) {
      if (useExisting) {
        await rm(temp, { force: true });
      } else {
        await rm(output, { force: true });
        await rename(temp, output);
      }
      converted += 1;
      if (deleteSource && await validWebp(output)) {
        await rm(item.absolute, { force: true });
        removed += 1;
      }
    } else {
      skipped += 1;
      await rm(temp, { force: true });
    }
  } catch (error) {
    failed += 1;
    await rm(temp, { force: true }).catch(() => {});
    console.error(`FAIL ${item.relative}: ${String(error?.message || error)}`);
  }
}

let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= sources.length) return;
    await processOne(sources[index]);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log("");
console.log(`Assets scanned: ${sources.length}`);
console.log(`Encoder: ${encoderName || "not used"}`);
console.log(`Source raster size: ${human(originalBytes)}`);
console.log(`Resulting WebP size: ${human(webpBytes)}`);
if (originalBytes > 0) console.log(`Estimated raster saving: ${((1 - webpBytes / originalBytes) * 100).toFixed(1)}%`);
console.log(`Converted: ${converted}; deleted sources: ${removed}; dry-run: ${skipped}; failed: ${failed}`);

if (apply && failed === 0) {
  console.log("");
  console.log("WebP conversion complete. Regenerate manifests before deploy:");
  console.log("  node scripts/check-assets.mjs --news-manifest");
  console.log("  node scripts/check-assets.mjs --new-only");
}
if (!apply) {
  console.log("");
  console.log("Dry-run only. To write WebP and remove PNG/JPG/JPEG sources:");
  console.log("  node scripts/optimize-assets-webp.mjs --apply --delete-source");
}
if (failed > 0) process.exitCode = 1;
