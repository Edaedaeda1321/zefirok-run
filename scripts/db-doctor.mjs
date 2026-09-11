#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { D1_DATABASE_NAME } from './schema-contract.mjs';

const argv = process.argv.slice(2);
const remote = argv.includes('--remote');
const gate = argv.includes('--gate');
const noSamples = argv.includes('--no-samples') || gate;
const databaseArg = argv.find(value => value.startsWith('--database='));
const database = databaseArg ? databaseArg.slice('--database='.length) : D1_DATABASE_NAME;
const root = process.cwd();
const now = Math.floor(Date.now() / 1000);
const nowMs = Date.now();

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${stderr || stdout}`)));
  });
}

function parseWranglerJson(text) {
  const source = String(text || '').trim();
  try { return JSON.parse(source); } catch {}
  const starts = [source.indexOf('['), source.indexOf('{')].filter(index => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = source.length; end > start; end -= 1) {
      const char = source[end - 1];
      if (char !== ']' && char !== '}') continue;
      try { return JSON.parse(source.slice(start, end)); } catch {}
    }
  }
  throw new Error(`Wrangler returned unexpected JSON:\n${source.slice(0, 1200)}`);
}

function collectResultRows(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectResultRows(item, out);
    return out;
  }
  if (Array.isArray(value.results)) out.push(...value.results);
  for (const [key, child] of Object.entries(value)) {
    if (key === 'results') continue;
    if (child && typeof child === 'object') collectResultRows(child, out);
  }
  return out;
}

async function sql(command) {
  const args = ['wrangler', 'd1', 'execute', database, remote ? '--remote' : '--local', '--json', '--command', command];
  const { stdout } = await run('npx', args);
  return collectResultRows(parseWranglerJson(stdout));
}

function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function hasAll(set, names) { return names.every(name => set.has(name)); }

async function loadSchema() {
  const tableRows = await sql("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tables = new Set(tableRows.map(row => String(row.name || '')).filter(Boolean));
  const wanted = [
    'admin_profile_state','case_player_state','level_case_openings','granted_cases','reward_delivery_queue',
    'game_run_sessions','season_pass_seasons','season_pass_players','season_pass_claims','season_pass_purchases',
    'player_account_revision','live_content_release_rules','live_content_registry_state'
  ].filter(name => tables.has(name));
  const columns = new Map();
  for (const table of wanted) {
    const rows = await sql(`SELECT name FROM pragma_table_info(${quote(table)})`);
    columns.set(table, new Set(rows.map(row => String(row.name || '')).filter(Boolean)));
  }
  return { tables, columns };
}

const schema = await loadSchema();
const checks = [];
function add(check) {
  const tables = check.tables || [];
  if (!hasAll(schema.tables, tables)) return;
  for (const [table, cols] of Object.entries(check.columns || {})) {
    const available = schema.columns.get(table) || new Set();
    if (!hasAll(available, cols)) return;
  }
  checks.push(check);
}

add({
  id:'negative_profile_balances', severity:'critical', title:'Negative player balances', tables:['admin_profile_state'],
  columns:{admin_profile_state:['wallet','treats','coffee','profile_xp']},
  count:`SELECT COUNT(*) AS c FROM admin_profile_state WHERE wallet<0 OR treats<0 OR coffee<0 OR profile_xp<0`,
  sample:`SELECT json_object('telegram_id',telegram_id,'wallet',wallet,'treats',treats,'coffee',coffee,'profile_xp',profile_xp) AS sample FROM admin_profile_state WHERE wallet<0 OR treats<0 OR coffee<0 OR profile_xp<0 LIMIT 5`
});

const caseJsonColumns = ['owned_avatars_json','owned_frames_json','owned_trails_json','owned_skins_json','owned_music_json','owned_specials_json','boosters_extra_json','active_boosters_json']
  .filter(column => schema.columns.get('case_player_state')?.has(column));
if (schema.tables.has('case_player_state') && caseJsonColumns.length) {
  add({
    id:'invalid_case_state_json', severity:'critical', title:'Invalid JSON in case player state', tables:['case_player_state'],
    count:`SELECT COUNT(*) AS c FROM case_player_state WHERE ${caseJsonColumns.map(column => `json_valid(${column})=0`).join(' OR ')}`,
    sample:`SELECT json_object('telegram_id',telegram_id) AS sample FROM case_player_state WHERE ${caseJsonColumns.map(column => `json_valid(${column})=0`).join(' OR ')} LIMIT 5`
  });
}

add({
  id:'invalid_level_case_rewards_json', severity:'critical', title:'Invalid level case reward JSON', tables:['level_case_openings'],
  columns:{level_case_openings:['telegram_id','level','rewards_json']},
  count:`SELECT COUNT(*) AS c FROM level_case_openings WHERE json_valid(rewards_json)=0`,
  sample:`SELECT json_object('telegram_id',telegram_id,'level',level) AS sample FROM level_case_openings WHERE json_valid(rewards_json)=0 LIMIT 5`
});
add({
  id:'invalid_granted_case_rewards_json', severity:'critical', title:'Invalid granted case reward JSON', tables:['granted_cases'],
  columns:{granted_cases:['id','telegram_id','rewards_json']},
  count:`SELECT COUNT(*) AS c FROM granted_cases WHERE json_valid(rewards_json)=0`,
  sample:`SELECT json_object('id',id,'telegram_id',telegram_id) AS sample FROM granted_cases WHERE json_valid(rewards_json)=0 LIMIT 5`
});
add({
  id:'invalid_reward_queue_payload', severity:'critical', title:'Invalid active reward queue payload JSON', tables:['reward_delivery_queue'],
  columns:{reward_delivery_queue:['id','telegram_id','payload_json','status']},
  count:`SELECT COUNT(*) AS c FROM reward_delivery_queue WHERE status IN ('pending','delivering','failed') AND json_valid(payload_json)=0`,
  sample:`SELECT json_object('id',id,'telegram_id',telegram_id,'status',status) AS sample FROM reward_delivery_queue WHERE status IN ('pending','delivering','failed') AND json_valid(payload_json)=0 LIMIT 5`
});
add({
  id:'invalid_case_revision', severity:'critical', title:'Invalid case state revision', tables:['case_player_state'],
  columns:{case_player_state:['telegram_id','revision']},
  count:`SELECT COUNT(*) AS c FROM case_player_state WHERE revision<1`,
  sample:`SELECT json_object('telegram_id',telegram_id,'revision',revision) AS sample FROM case_player_state WHERE revision<1 LIMIT 5`
});
add({
  id:'invalid_live_content_routes', severity:'critical', title:'Invalid Live Content routes JSON', tables:['live_content_registry_state'],
  columns:{live_content_registry_state:['item_kind','item_id','routes_json']},
  count:`SELECT COUNT(*) AS c FROM live_content_registry_state WHERE json_valid(routes_json)=0`,
  sample:`SELECT json_object('kind',item_kind,'item_id',item_id) AS sample FROM live_content_registry_state WHERE json_valid(routes_json)=0 LIMIT 5`
});
add({
  id:'invalid_live_content_state', severity:'critical', title:'Invalid authoritative Live Content state', tables:['live_content_registry_state'],
  columns:{live_content_registry_state:['item_kind','item_id','status','release_at','ever_released']},
  count:`SELECT COUNT(*) AS c FROM live_content_registry_state WHERE status NOT IN ('draft','hidden','scheduled','open','archived') OR ever_released NOT IN (0,1) OR release_at<0`,
  sample:`SELECT json_object('kind',item_kind,'item_id',item_id,'status',status,'release_at',release_at,'ever_released',ever_released) AS sample FROM live_content_registry_state WHERE status NOT IN ('draft','hidden','scheduled','open','archived') OR ever_released NOT IN (0,1) OR release_at<0 LIMIT 5`
});
add({
  id:'live_content_missing_authority', severity:'critical', title:'Legacy Live Content row without authoritative registry row', tables:['live_content_release_rules','live_content_registry_state'],
  columns:{live_content_release_rules:['item_kind','item_id'],live_content_registry_state:['item_kind','item_id']},
  count:`SELECT COUNT(*) AS c FROM live_content_release_rules r LEFT JOIN live_content_registry_state s ON s.item_kind=r.item_kind AND s.item_id=r.item_id WHERE s.item_id IS NULL`,
  sample:`SELECT json_object('kind',r.item_kind,'item_id',r.item_id) AS sample FROM live_content_release_rules r LEFT JOIN live_content_registry_state s ON s.item_kind=r.item_kind AND s.item_id=r.item_id WHERE s.item_id IS NULL LIMIT 5`
});
add({
  id:'live_content_shadow_status_drift', severity:'critical', title:'Live Content compatibility status drift', tables:['live_content_release_rules','live_content_registry_state'],
  columns:{live_content_release_rules:['item_kind','item_id','released'],live_content_registry_state:['item_kind','item_id','status']},
  count:`SELECT COUNT(*) AS c FROM live_content_registry_state s JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE r.released<>CASE WHEN s.status='open' THEN 1 ELSE 0 END`,
  sample:`SELECT json_object('kind',s.item_kind,'item_id',s.item_id,'registry_status',s.status,'legacy_released',r.released) AS sample FROM live_content_registry_state s JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE r.released<>CASE WHEN s.status='open' THEN 1 ELSE 0 END LIMIT 5`
});
add({
  id:'live_content_shadow_season_drift', severity:'critical', title:'Live Content compatibility season drift', tables:['live_content_release_rules','live_content_registry_state'],
  columns:{live_content_release_rules:['item_kind','item_id','content_season_id'],live_content_registry_state:['item_kind','item_id','content_season_id']},
  count:`SELECT COUNT(*) AS c FROM live_content_registry_state s JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE COALESCE(r.content_season_id,'')<>COALESCE(s.content_season_id,'')`,
  sample:`SELECT json_object('kind',s.item_kind,'item_id',s.item_id,'registry_season',s.content_season_id,'legacy_season',r.content_season_id) AS sample FROM live_content_registry_state s JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE COALESCE(r.content_season_id,'')<>COALESCE(s.content_season_id,'') LIMIT 5`
});

add({
  id:'expired_reward_delivery_leases', severity:'warning', title:'Expired reward delivery leases', tables:['reward_delivery_queue'],
  columns:{reward_delivery_queue:['id','telegram_id','status','lease_until']},
  count:`SELECT COUNT(*) AS c FROM reward_delivery_queue WHERE status='delivering' AND lease_until>0 AND lease_until<${now}`,
  sample:`SELECT json_object('id',id,'telegram_id',telegram_id,'lease_until',lease_until) AS sample FROM reward_delivery_queue WHERE status='delivering' AND lease_until>0 AND lease_until<${now} ORDER BY lease_until LIMIT 5`
});
add({
  id:'reward_queue_empty_source_id', severity:'warning', title:'Reward rows with empty idempotency source', tables:['reward_delivery_queue'],
  columns:{reward_delivery_queue:['id','telegram_id','source_type','source_id','status']},
  count:`SELECT COUNT(*) AS c FROM reward_delivery_queue WHERE source_id='' AND status NOT IN ('cancelled')`,
  sample:`SELECT json_object('id',id,'telegram_id',telegram_id,'source_type',source_type,'status',status) AS sample FROM reward_delivery_queue WHERE source_id='' AND status NOT IN ('cancelled') ORDER BY id DESC LIMIT 5`
});
add({
  id:'stuck_granted_case_opening', severity:'warning', title:'Granted cases stuck in opening state', tables:['granted_cases'],
  columns:{granted_cases:['id','telegram_id','status','opening_started_at']},
  count:`SELECT COUNT(*) AS c FROM granted_cases WHERE status='opening' AND opening_started_at>0 AND opening_started_at<${now - 300}`,
  sample:`SELECT json_object('id',id,'telegram_id',telegram_id,'opening_started_at',opening_started_at) AS sample FROM granted_cases WHERE status='opening' AND opening_started_at>0 AND opening_started_at<${now - 300} ORDER BY opening_started_at LIMIT 5`
});
add({
  id:'stale_game_run_sessions', severity:'warning', title:'Expired game sessions still marked started', tables:['game_run_sessions'],
  columns:{game_run_sessions:['run_id','telegram_id','status','expires_at_ms']},
  count:`SELECT COUNT(*) AS c FROM game_run_sessions WHERE status='started' AND expires_at_ms<${nowMs - 300000}`,
  sample:`SELECT json_object('run_id',run_id,'telegram_id',telegram_id,'expires_at_ms',expires_at_ms) AS sample FROM game_run_sessions WHERE status='started' AND expires_at_ms<${nowMs - 300000} ORDER BY expires_at_ms LIMIT 5`
});
add({
  id:'stuck_season_pass_purchases', severity:'warning', title:'Season Pass purchases stuck pending', tables:['season_pass_purchases'],
  columns:{season_pass_purchases:['season_id','telegram_id','purchase_key','status','created_at']},
  count:`SELECT COUNT(*) AS c FROM season_pass_purchases WHERE status='pending' AND created_at<${now - 900}`,
  sample:`SELECT json_object('season_id',season_id,'telegram_id',telegram_id,'purchase_key',purchase_key,'created_at',created_at) AS sample FROM season_pass_purchases WHERE status='pending' AND created_at<${now - 900} ORDER BY created_at LIMIT 5`
});
add({
  id:'stuck_season_pass_claims', severity:'warning', title:'Season Pass claims stuck pending', tables:['season_pass_claims'],
  columns:{season_pass_claims:['season_id','telegram_id','level','lane','status','claimed_at']},
  count:`SELECT COUNT(*) AS c FROM season_pass_claims WHERE status='pending' AND claimed_at<${now - 900}`,
  sample:`SELECT json_object('season_id',season_id,'telegram_id',telegram_id,'level',level,'lane',lane,'claimed_at',claimed_at) AS sample FROM season_pass_claims WHERE status='pending' AND claimed_at<${now - 900} ORDER BY claimed_at LIMIT 5`
});
add({
  id:'multiple_active_seasons', severity:'warning', title:'Multiple Season Pass seasons active at once', tables:['season_pass_seasons'],
  columns:{season_pass_seasons:['season_id','starts_at','ends_at','manual_status']},
  count:`SELECT CASE WHEN COUNT(*)>1 THEN COUNT(*) ELSE 0 END AS c FROM season_pass_seasons WHERE manual_status='active' OR (manual_status='' AND starts_at<=${now} AND ends_at>=${now})`,
  sample:`SELECT json_object('season_id',season_id,'starts_at',starts_at,'ends_at',ends_at,'manual_status',manual_status) AS sample FROM season_pass_seasons WHERE manual_status='active' OR (manual_status='' AND starts_at<=${now} AND ends_at>=${now}) ORDER BY starts_at LIMIT 5`
});
add({
  id:'missing_player_account_revision', severity:'warning', title:'Player profile without account revision row', tables:['admin_profile_state','player_account_revision'],
  columns:{admin_profile_state:['telegram_id'],player_account_revision:['telegram_id']},
  count:`SELECT COUNT(*) AS c FROM admin_profile_state p LEFT JOIN player_account_revision a ON a.telegram_id=p.telegram_id WHERE a.telegram_id IS NULL`,
  sample:`SELECT json_object('telegram_id',p.telegram_id) AS sample FROM admin_profile_state p LEFT JOIN player_account_revision a ON a.telegram_id=p.telegram_id WHERE a.telegram_id IS NULL LIMIT 5`
});
add({
  id:'orphan_season_pass_players', severity:'warning', title:'Season Pass player row without season definition', tables:['season_pass_players','season_pass_seasons'],
  columns:{season_pass_players:['season_id','telegram_id'],season_pass_seasons:['season_id']},
  count:`SELECT COUNT(*) AS c FROM season_pass_players p LEFT JOIN season_pass_seasons s ON s.season_id=p.season_id WHERE s.season_id IS NULL`,
  sample:`SELECT json_object('season_id',p.season_id,'telegram_id',p.telegram_id) AS sample FROM season_pass_players p LEFT JOIN season_pass_seasons s ON s.season_id=p.season_id WHERE s.season_id IS NULL LIMIT 5`
});
add({
  id:'live_content_missing_legacy_shadow', severity:'warning', title:'Authoritative Live Content row without legacy shadow', tables:['live_content_release_rules','live_content_registry_state'],
  columns:{live_content_release_rules:['item_kind','item_id'],live_content_registry_state:['item_kind','item_id']},
  count:`SELECT COUNT(*) AS c FROM live_content_registry_state s LEFT JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE r.item_id IS NULL`,
  sample:`SELECT json_object('kind',s.item_kind,'item_id',s.item_id) AS sample FROM live_content_registry_state s LEFT JOIN live_content_release_rules r ON r.item_kind=s.item_kind AND r.item_id=s.item_id WHERE r.item_id IS NULL LIMIT 5`
});

const countSql = checks.map(check => `SELECT ${quote(check.id)} AS check_id, (${check.count.replace(/^SELECT\s+/i, 'SELECT ').replace(/;\s*$/, '')}) AS wrapped`).join('');
// SQLite cannot wrap arbitrary SELECT text as a scalar reliably when it already has FROM,
// so execute one compact UNION ALL statement instead.
const union = checks.map(check => {
  const match = check.count.match(/^SELECT\s+(.+?)\s+AS\s+c\s+FROM\s+([\s\S]+)$/i);
  if (!match) throw new Error(`Internal DB Doctor count SQL is not normalized for ${check.id}`);
  return `SELECT ${quote(check.id)} AS check_id, ${match[1]} AS issue_count FROM ${match[2]}`;
}).join(' UNION ALL ');

const countRows = checks.length ? await sql(union) : [];
const counts = new Map(countRows.map(row => [String(row.check_id || ''), Math.max(0, Number(row.issue_count || 0))]));
const results = [];
for (const check of checks) {
  const count = counts.get(check.id) || 0;
  const result = { id:check.id, severity:check.severity, title:check.title, count, samples:[] };
  if (count > 0 && !noSamples && check.sample) {
    try {
      const sampleRows = await sql(check.sample);
      result.samples = sampleRows.map(row => String(row.sample || '')).filter(Boolean).slice(0, 5);
    } catch (error) {
      result.samples = [`sample query failed: ${error?.message || error}`];
    }
  }
  results.push(result);
}

const critical = results.filter(item => item.severity === 'critical' && item.count > 0);
const warnings = results.filter(item => item.severity === 'warning' && item.count > 0);
console.log(`DB Doctor ${remote ? 'REMOTE' : 'LOCAL'}: ${checks.length} check(s), ${critical.length} critical check(s) with issues, ${warnings.length} warning check(s) with issues.`);
for (const item of results.filter(result => result.count > 0)) {
  const tag = item.severity === 'critical' ? 'CRITICAL' : 'WARN';
  console.log(`${tag} ${item.id}: ${item.count} - ${item.title}`);
  for (const sample of item.samples) console.log(`  ${sample}`);
}
if (!critical.length && !warnings.length) console.log('DB Doctor: no known data integrity anomalies found.');

const report = {
  version:1,
  database,
  target:remote ? 'remote' : 'local',
  checkedAt:new Date().toISOString(),
  checkedAtUnix:now,
  checks:results,
  summary:{ criticalChecksWithIssues:critical.length, warningChecksWithIssues:warnings.length }
};
await mkdir(path.join(root, '.wrangler'), { recursive:true });
await writeFile(path.join(root, '.wrangler', 'db-doctor-last.json'), `${JSON.stringify(report, null, 2)}\n`);

if (gate && critical.length) {
  console.error('\nDB DOCTOR GATE FAILED: critical data integrity anomalies found. Deployment stopped.');
  process.exitCode = 1;
}
