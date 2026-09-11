#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const worker = await readFile(path.join(root, 'src', 'worker.js'), 'utf8');
const migration = await readFile(path.join(root, 'migrations', '0086_live_content_registry_authority.sql'), 'utf8');
const problems = [];

function need(text, label) { if (!worker.includes(text)) problems.push(`Worker missing: ${label}`); }
function forbid(text, label) { if (worker.includes(text)) problems.push(`Worker still contains legacy authority path: ${label}`); }

need('FROM live_content_registry_state ORDER BY item_kind,item_id', 'authoritative Live Content read from registry_state');
need('INSERT INTO live_content_registry_state(item_kind,item_id,content_season_id,status,release_at,routes_json,ever_released,updated_at,updated_by)', 'authoritative registry mutation');
need('INSERT INTO live_content_release_rules(item_kind,item_id,content_season_id,released,ever_released,destination_type,destination_id,destination_config_json,updated_at,updated_by)', 'legacy shadow mutation');
need("SELECT item_kind,item_id FROM live_content_registry_state WHERE status='scheduled'", 'scheduler reads authoritative registry');
need('function liveContentRoutesFromRegistryStorage(raw)', 'registry-only route parser');
forbid('FROM live_content_release_rules r LEFT JOIN live_content_registry_state', 'joined legacy-first read');
forbid("PRAGMA table_info(live_content_release_rules)", 'lazy ALTER for release_rules');

for (const fragment of [
  'ALTER TABLE live_content_registry_state',
  'ADD COLUMN content_season_id',
  'ADD COLUMN ever_released',
  'idx_live_content_registry_season',
  'UPDATE live_content_registry_state',
  'routes_json =',
  'UPDATE live_content_release_rules'
]) {
  if (!migration.includes(fragment)) problems.push(`Migration 0086 missing: ${fragment}`);
}

if (problems.length) {
  console.error('LIVE CONTENT AUTHORITY CHECK FAILED');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('Live Content authority check passed: registry_state is authoritative; release_rules is compatibility shadow.');
