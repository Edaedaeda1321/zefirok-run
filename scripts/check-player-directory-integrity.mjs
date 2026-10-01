#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(message)=>{throw new Error(`Player directory integrity check failed: ${message}`);};
const expect=(value,message)=>{if(!value)fail(message);};
const between=(source,start,end,label)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0||b<=a)fail(`cannot isolate ${label}`);
  return source.slice(a,b);
};

const worker=read('src/worker.js');
const owner=read('owner.html');
const migrationPath='migrations/0110_player_directory_integrity.sql';
const migration=read(migrationPath);
const lock=JSON.parse(read('scripts/migration-history.lock.json'));
const fixture=read('scripts/fixtures/d1_pre_0087_snapshot.sql');

const runStart=between(worker,'async function startAuthoritativeRunSession','async function claimSkinPurchaseCaseBonus','run start');
expect(runStart.includes('INSERT OR IGNORE INTO admin_profile_state'),'run start does not materialize a missing profile directory row');
expect(runStart.includes("'run-start'"),'run-start profile shell is missing an explicit server provenance marker');
expect(runStart.includes('const result = await env.DB.batch(['),'run-start profile shell is not kept in the existing atomic batch');

const recovery=between(worker,'async function repairLeaderboardFromServerRunRegistry','async function leaderboardRatingFallbackCandidates','server registry recovery');
expect(recovery.includes('INSERT INTO admin_profile_state'),'rating recovery does not reconcile the authoritative player directory');
expect(recovery.includes('best_score=MAX(admin_profile_state.best_score,excluded.best_score)'),'rating recovery can overwrite or fail to advance the proven personal record');
expect(recovery.includes("'rating:server_registry_recovery'"),'rating recovery profile reconciliation has no provenance marker');

const fraud=between(worker,'async function scanFraudAlerts','async function showFraudDashboard','fraud scanner');
expect(fraud.includes('const minDurationMs = minSeconds * 1000'),'fraud scanner still has a fixed duration policy');
expect(fraud.includes('const proofMinMs = Math.max(1000, minDurationMs - proofGraceMs)'),'fraud scanner does not share the server-proof grace floor');
expect(fraud.includes('trustedRegistryRecovery'),'fraud scanner does not distinguish trusted server recovery from a real too-fast run');
expect(fraud.includes("rejectionReason === 'server_registry_recovery'"),'server registry provenance is not recognized');
expect(fraud.includes("r.rejection_reason NOT IN ('below_minimum','rating_disabled','server_registry_recovery')"),'server recovery is still treated as a rejected-run reason');
expect(fraud.includes("alert_type='too_fast_run'"),'legacy false-positive too-fast alerts are not reconciled');
expect(!fraud.includes('duration_ms < 12000'),'fraud scanner still hard-codes the old 12 second threshold in SQL');

expect(/INSERT OR IGNORE INTO admin_profile_state[\s\S]*FROM leaderboard_all_time/i.test(migration),'migration does not backfill missing profiles from all-time rating');
expect(/INSERT OR IGNORE INTO admin_profile_state[\s\S]*FROM leaderboard_entries/i.test(migration),'migration does not backfill missing profiles from seasonal rating');
expect(!/DELETE\s+FROM\s+admin_profile_state/i.test(migration),'migration must never delete player profiles');
expect(!/UPDATE\s+admin_profile_state/i.test(migration),'migration must not overwrite existing player economy rows');

expect(owner.includes("rawTotal==null||!Number.isFinite(total)?'—':fmt(total)"),'Control Center still renders an unloaded player total as zero');
expect(/CREATE TABLE leaderboard_entries\s*\(/i.test(fixture),'D1 pre-0087 fixture is missing leaderboard_entries required by 0110 replay');
expect(/CREATE TABLE leaderboard_all_time\s*\(/i.test(fixture),'D1 pre-0087 fixture is missing leaderboard_all_time required by 0110 replay');

const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,migrationPath))).digest('hex');
expect(lock?.files?.['0110_player_directory_integrity.sql']===digest,'migration history lock is missing or has the wrong 0110 checksum');

console.log('Player directory integrity check PASS: run-start/recovery keep CC discoverability, trusted registry recovery is not a fraud false-positive, and legacy rating-only profiles are backfilled.');
