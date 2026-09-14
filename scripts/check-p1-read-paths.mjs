#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const worker = await readFile('src/worker.js','utf8');
const index = await readFile('index.html','utf8');
const fail=(msg)=>{throw new Error(`P1 read-path check failed: ${msg}`)};
const between=(start,end)=>{const a=worker.indexOf(start);if(a<0)fail(`missing ${start}`);const b=worker.indexOf(end,a+start.length);if(b<0)fail(`missing end ${end}`);return worker.slice(a,b)};

const album=between('async function albumPlayerState','async function getAlbumState');
if(album.includes('ensureAuthoritativeProfileRow('))fail('Album still depends on authoritative profile migration');
if(!album.includes('skipProfile:true'))fail('Album does not use inventory-only case state');
if(!worker.includes('withAlbumAcquisitionTimeout(albumAcquisitionSources(env))'))fail('Album acquisition metadata is still blocking');

const referrals=between('async function getReferralState','async function getReferralSummary');
if(referrals.includes('ensureAuthoritativeProfileRow('))fail('Referral state read still folds authoritative economy');

const sync=between('async function syncAdminProfile','function normalizeAdminProfile');
if(!sync.includes("allowLegacyRecovery: mode !== 'read'"))fail('Profile read can still run legacy recovery');

const season=between('async function ensureSeasonPassSchema','function defaultSeasonPassTasks');
const quickAt=season.indexOf('seasonPassSchemaQuickCheck(env)');
const markerReturn=season.indexOf('seasonPassSchemaMarkerReady(env)');
if(quickAt<0||markerReturn<0||quickAt<markerReturn)fail('Season schema marker/quick-check hardening missing');

if(!worker.includes('/api/profile/overview'))fail('Consolidated profile overview endpoint missing');
if(!index.includes('/api/profile/overview'))fail('Profile UI does not use consolidated overview endpoint');
if(!index.includes('controller.abort(), 4000'))fail('Account revision fetch has no bounded timeout');
if(!worker.includes("startupBounded('cases'"))fail('Startup cases section is not bounded');
if(!worker.includes("startupBounded('news'"))fail('Startup side sections are not bounded');
if(worker.includes('Promise.all([startupSideSections,presencePromise])'))fail('Presence tracking still blocks startup');

console.log('P1 read-path checks passed: Album, referrals, profile overview, startup bounds, season schema and account revision are hardened.');
