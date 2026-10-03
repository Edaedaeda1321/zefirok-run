#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const iosRoot = path.resolve(scriptDir, '..');
const projectFile = path.join(iosRoot, 'SweetRun.xcodeproj', 'project.pbxproj');
const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? String(args[i + 1] || '').trim() : '';
}
function fail(message) {
  console.error(`iOS config: ${message}`);
  process.exit(1);
}
function replaceAllChecked(source, pattern, replacement, minCount, label) {
  const matches = source.match(pattern) || [];
  if (matches.length < minCount) fail(`${label}: expected at least ${minCount} match(es), found ${matches.length}`);
  return source.replace(pattern, replacement);
}

const clientId = arg('--client-id');
const teamId = arg('--team-id');
const bundleId = arg('--bundle-id');

if (!/^\d{4,20}$/.test(clientId)) fail('use --client-id with the numeric Telegram Client ID from BotFather.');
if (!/^[A-Z0-9]{10}$/.test(teamId)) fail('use --team-id with the 10-character Apple Developer Team ID.');
if (!/^[A-Za-z][A-Za-z0-9]*(?:[.-][A-Za-z0-9-]+){2,}$/.test(bundleId)) fail('use a reverse-DNS value for --bundle-id, e.g. com.company.sweetrun.');
if (!fs.existsSync(projectFile)) fail(`missing ${projectFile}`);

let source = fs.readFileSync(projectFile, 'utf8');
source = replaceAllChecked(source, /DEVELOPMENT_TEAM = "[A-Z0-9]*";/g, `DEVELOPMENT_TEAM = "${teamId}";`, 2, 'Development Team');
source = replaceAllChecked(source, /SWEET_RUN_TELEGRAM_CLIENT_ID = "\d*";/g, `SWEET_RUN_TELEGRAM_CLIENT_ID = "${clientId}";`, 2, 'Telegram Client ID');

const releasePattern = /PRODUCT_BUNDLE_IDENTIFIER = (?:com\.sweetrun\.game|[A-Za-z][A-Za-z0-9.-]+);/g;
const releaseMatches = [...source.matchAll(releasePattern)];
if (releaseMatches.length < 2) fail(`Bundle ID: expected Debug/Release settings, found ${releaseMatches.length}.`);
let bundleIndex = 0;
source = source.replace(releasePattern, () => {
  bundleIndex += 1;
  return `PRODUCT_BUNDLE_IDENTIFIER = ${bundleIndex === 1 ? `${bundleId}.dev` : bundleId};`;
});

fs.writeFileSync(projectFile, source);
console.log('Sweet Run iOS project configured.');
console.log(`  Team ID: ${teamId}`);
console.log(`  Debug Bundle ID: ${bundleId}.dev`);
console.log(`  Release Bundle ID: ${bundleId}`);
console.log(`  Telegram Client ID: ${clientId}`);
console.log('The Telegram Client ID is an application identifier, not the Client Secret. Never put the Client Secret into the project.');
