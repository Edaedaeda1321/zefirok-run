#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const skipD1 = process.argv.includes('--skip-d1');
const wiringOnly = process.argv.includes('--wiring-only');

function fail(message) {
  throw new Error(`Production release gate wiring failed: ${message}`);
}

function readRequired(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`missing ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0) fail(`${label}: missing ${first}`);
  if (secondIndex < 0) fail(`${label}: missing ${second}`);
  if (firstIndex >= secondIndex) fail(`${label}: ${first} must run before ${second}`);
}

function verifyReleaseWiring() {
  const update = readRequired('update.sh');
  const workflow = readRequired('.github/workflows/production-gate.yml');
  const gateCall = 'node scripts/check-production-gate.mjs';

  if (!/^set -euo pipefail$/m.test(update)) fail('update.sh must use set -euo pipefail so any failed check aborts deploy');
  if (update.includes(`${gateCall} --skip-d1`)) fail('update.sh must not bypass D1 integration checks');
  if (!/\bwrangler(?:@[^\s]+)?\s+deploy\b/.test(update)) fail('update.sh deploy command is missing');
  assertBefore(update, gateCall, 'node scripts/predeploy-schema-gate.mjs --remote --write-stamp', 'update.sh');
  assertBefore(update, gateCall, 'node scripts/db-doctor.mjs --remote --gate --no-samples', 'update.sh');
  const gateIndex = update.indexOf(gateCall);
  const deployIndex = update.search(/\bwrangler(?:@[^\s]+)?\s+deploy\b/);
  if (gateIndex < 0 || deployIndex < 0 || gateIndex >= deployIndex) fail('update.sh must run the production gate before deploy');

  if (!/^\s*pull_request:\s*$/m.test(workflow) || !/^\s*push:\s*$/m.test(workflow)) {
    fail('GitHub Production Gate workflow must run for pull_request and push');
  }
  const mainBranchGuards = workflow.match(/^\s*branches:\s*\[main\]\s*$/gm) || [];
  if (mainBranchGuards.length < 2) fail('GitHub Production Gate workflow must protect main for pull_request and push');
  if (!workflow.includes(`run: ${gateCall}`)) fail('GitHub Production Gate workflow does not execute the production gate');
  if (workflow.includes(`run: ${gateCall} --skip-d1`)) fail('GitHub Production Gate workflow must not bypass D1 integration checks');
  const workflowGateStart = workflow.indexOf('- name: Run production gate');
  const workflowNextStep = workflow.indexOf('\n      - name:', workflowGateStart + 1);
  const workflowGateStep = workflowGateStart >= 0
    ? workflow.slice(workflowGateStart, workflowNextStep >= 0 ? workflowNextStep : workflow.length)
    : '';
  if (!workflowGateStep) fail('GitHub Production Gate workflow is missing the named gate step');
  if (/continue-on-error:\s*true/i.test(workflowGateStep)) fail('GitHub Production Gate step must fail closed, not continue on errors');

  console.log('Release wiring checks passed: ./update.sh and GitHub CI both fail closed through the production gate.');
}

const steps = [
  ['repository hygiene', 'node', ['scripts/check-repo-hygiene.mjs']],
  ['worker syntax', 'node', ['--check', 'src/worker.js']],
  ['index srcdoc integrity', 'node', ['scripts/check-index-srcdoc.mjs']],
  // Protect the exact regression that previously made rating/profile reads hang:
  // public leaderboard reads must remain read-only and first paint must stay lazy.
  ['rating fast reads', 'node', ['scripts/check-rating-fast-read.mjs']],
  ['migration history', 'node', ['scripts/check-migrations.mjs']],
  ['schema contract', 'node', ['scripts/check-database-schema.mjs', '--contract-only']],
  ['deploy assets', 'node', ['scripts/check-deploy-assets.mjs']],
  ['asset manifests', 'node', ['scripts/check-assets.mjs', '--news-manifest']],
  ['production UI assets', 'node', ['scripts/check-assets.mjs']],
  ['content-hash manifest', 'node', ['scripts/check-asset-manifest.mjs']],
  ['live content assets', 'node', ['scripts/check-live-content-assets.mjs']],
  ['live content authority', 'node', ['scripts/check-live-content-authority.mjs']],
  // Operation system includes the server-authoritative purchase/case/booster guards.
  ['operation system', 'node', ['scripts/check-operation-system.mjs']],
  ['P1 read paths', 'node', ['scripts/check-p1-read-paths.mjs']],
  ['P2 hardening', 'node', ['scripts/check-p2-hardening.mjs']]
];
if (!skipD1) steps.push(['D1 integration', 'node', ['scripts/check-d1-integration.mjs']]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} ${args.join(' ')} failed (${code})`)));
  });
}

verifyReleaseWiring();
if (wiringOnly) {
  console.log('\nProduction release gate wiring OK. Full checks were not requested (--wiring-only).');
  process.exit(0);
}

for (const [label, command, args] of steps) {
  console.log(`\n=== Production gate: ${label} ===`);
  await run(command, args);
}
console.log(`\nProduction gate OK: release wiring + ${steps.length} checks passed${skipD1 ? ' (D1 skipped explicitly)' : ''}.`);
