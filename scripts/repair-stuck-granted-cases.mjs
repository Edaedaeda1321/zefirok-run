#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import { D1_DATABASE_NAME } from './schema-contract.mjs';

const argv = process.argv.slice(2);
const arg = (name) => argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const execute = argv.includes('--execute');
const remote = argv.includes('--remote');
const telegramId = arg('--telegram-id').trim();
const caseTypes = arg('--case-types').split(',').map((value) => value.trim()).filter(Boolean);
const expected = Math.max(0, Number.parseInt(arg('--expected') || '0', 10) || 0);
const database = arg('--database') || D1_DATABASE_NAME;

if (!remote) {
  console.error('REFUSED: this repair tool requires --remote so it cannot silently mutate a local D1 copy.');
  process.exit(2);
}
if (!/^\d{4,20}$/.test(telegramId)) {
  console.error('REFUSED: pass a valid --telegram-id=<digits>.');
  process.exit(2);
}
if (!expected || caseTypes.length !== expected || caseTypes.some((value) => !/^[a-z0-9_-]{1,48}$/.test(value))) {
  console.error('REFUSED: --case-types must contain exactly --expected valid case types.');
  process.exit(2);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve({ stdout, stderr })
      : reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${stderr || stdout}`)));
  });
}

function parseWranglerJson(text) {
  const source = String(text || '').trim();
  try { return JSON.parse(source); } catch {}
  const starts = [source.indexOf('['), source.indexOf('{')].filter((index) => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = source.length; end > start; end -= 1) {
      const char = source[end - 1];
      if (char !== ']' && char !== '}') continue;
      try { return JSON.parse(source.slice(start, end)); } catch {}
    }
  }
  throw new Error(`Wrangler returned unexpected JSON:\n${source.slice(0, 1200)}`);
}

function collectRows(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectRows(item, out);
    return out;
  }
  if (Array.isArray(value.results)) out.push(...value.results);
  for (const [key, child] of Object.entries(value)) {
    if (key === 'results') continue;
    if (child && typeof child === 'object') collectRows(child, out);
  }
  return out;
}

async function sql(command) {
  const args = ['--yes', 'wrangler@4.131.1', 'd1', 'execute', database, '--remote', '--json', '--command', command];
  const { stdout } = await run('npx', args);
  return collectRows(parseWranglerJson(stdout));
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const typeList = caseTypes.map(quote).join(',');
const now = Math.floor(Date.now() / 1000);
const staleBefore = now - 300;

const candidates = await sql(`
SELECT id,telegram_id,case_type,status,rewards_json,COALESCE(opened_at,0) AS opened_at,opening_started_at,opening_token
FROM granted_cases
WHERE telegram_id=${quote(telegramId)}
  AND status='opening'
  AND opening_started_at>0
  AND opening_started_at<${staleBefore}
ORDER BY opening_started_at,id
`);

console.log('Repair candidates:');
console.table(candidates.map((row) => ({
  id: row.id,
  telegram_id: row.telegram_id,
  case_type: row.case_type,
  status: row.status,
  opened_at: Number(row.opened_at || 0),
  opening_started_at: Number(row.opening_started_at || 0),
  rewards_json: row.rewards_json
})));

if (candidates.length !== expected) {
  console.error(`REFUSED: expected exactly ${expected} stale opening row(s), found ${candidates.length}.`);
  process.exit(3);
}

const actualTypes = candidates.map((row) => String(row.case_type || '')).sort();
const wantedTypes = [...caseTypes].sort();
if (JSON.stringify(actualTypes) !== JSON.stringify(wantedTypes)) {
  console.error(`REFUSED: case types differ. Expected ${wantedTypes.join(',')}; found ${actualTypes.join(',')}.`);
  process.exit(3);
}

for (const row of candidates) {
  if (Number(row.opened_at || 0) !== 0) {
    console.error(`REFUSED: ${row.id} already has opened_at=${row.opened_at}.`);
    process.exit(3);
  }
  let rewards;
  try { rewards = JSON.parse(String(row.rewards_json || '')); } catch { rewards = null; }
  if (!Array.isArray(rewards) || rewards.length !== 0) {
    console.error(`REFUSED: ${row.id} already has a non-empty or invalid rewards_json.`);
    process.exit(3);
  }
}

if (!execute) {
  console.log('\nDRY RUN ONLY. No rows changed. Re-run with --execute after verifying the two rows above.');
  process.exit(0);
}

const ids = candidates.map((row) => quote(row.id)).join(',');
await sql(`
UPDATE granted_cases
SET status='pending',
    opening_started_at=0,
    opening_token=''
WHERE id IN (${ids})
  AND telegram_id=${quote(telegramId)}
  AND case_type IN (${typeList})
  AND status='opening'
  AND (opened_at IS NULL OR opened_at=0)
  AND json_valid(rewards_json)=1
  AND json_type(rewards_json)='array'
  AND json_array_length(rewards_json)=0
`);

const after = await sql(`
SELECT id,telegram_id,case_type,status,rewards_json,COALESCE(opened_at,0) AS opened_at,opening_started_at,opening_token
FROM granted_cases
WHERE id IN (${ids})
ORDER BY id
`);

const bad = after.filter((row) => String(row.status || '') !== 'pending'
  || Number(row.opened_at || 0) !== 0
  || Number(row.opening_started_at || 0) !== 0
  || String(row.opening_token || '') !== '');

if (after.length !== expected || bad.length) {
  console.error('REPAIR VERIFICATION FAILED. Current rows:');
  console.table(after);
  process.exit(4);
}

console.log(`REPAIR OK: restored exactly ${expected} granted case(s) to pending for player ${telegramId}.`);
console.table(after.map((row) => ({ id: row.id, case_type: row.case_type, status: row.status })));
