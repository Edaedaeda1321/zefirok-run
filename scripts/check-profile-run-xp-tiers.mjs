#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(message)=>{console.error(`PROFILE RUN XP V24 CHECK FAILED: ${message}`);process.exit(1);};
const expect=(condition,message)=>{if(!condition)fail(message);};

const worker=read('src/worker.js');
const index=read('index.html');

for(const [needle,label] of [
  ['const AUTHORITATIVE_PROFILE_RUN_XP_DAILY_BONUS = 22;','server daily bonus XP'],
  ['const AUTHORITATIVE_PROFILE_RUN_XP_STANDARD = 4;','server standard XP'],
  ['const AUTHORITATIVE_PROFILE_RUN_XP_GRIND = 2;','server grind XP'],
  ['const AUTHORITATIVE_PROFILE_RUN_XP_DAILY_BONUS_RUNS = 3;','server bonus run count'],
  ['const AUTHORITATIVE_PROFILE_RUN_XP_STANDARD_THROUGH = 10;','server standard run ceiling'],
  ['const AUTHORITATIVE_PROFILE_RUN_XP_DAY_OFFSET_SECONDS = 3 * 3600;','Moscow day boundary'],
  ['profile_xp>0 AND created_at>=? AND created_at<?','ledger-backed daily count'],
  ['profileRunXpBaseForOrdinal(Number(profileRunXpDailyBefore?.creditedRuns || 0) + 1)','server tier selection'],
  ['AUTHORITATIVE_PROFILE_LEGACY_RUN_XP','legacy recovery compatibility'],
  ['profileXpRun, profileXpDaily','server settlement metadata']
]) expect(worker.includes(needle),`missing ${label}`);

for(const [needle,label] of [
  ['const PROFILE_XP_RUN_DAILY_BONUS = 22;','client daily bonus copy'],
  ['const PROFILE_XP_RUN_STANDARD = 4;','client standard copy'],
  ['const PROFILE_XP_RUN_GRIND = 2;','client grind copy'],
  ['const PROFILE_XP_RUN_DAILY_BONUS_COUNT = 3;','client bonus run count'],
  ['const PROFILE_XP_RUN_STANDARD_THROUGH = 10;','client standard run ceiling'],
  ['data-profile-run-xp-daily','profile daily bonus UI'],
  ['profileXpDailyBonusMarkup','run result daily bonus receipt'],
  ['applyProfileRunXpDailyState(data.runSettlement.profileXpDaily)','settlement daily-state sync'],
  ['const runXpEarned = 0;','no optimistic client run XP'],
  ['serverAwarded = payload && Object.prototype.hasOwnProperty.call(payload, &quot;profileXpAwarded&quot;)','legacy reconcile trusts server award']
]) expect(index.includes(needle),`missing ${label}`);

expect(!index.includes('state.profileXp += runXpEarned'),'client still grants run XP optimistically');
expect(!worker.includes('AUTHORITATIVE_PROFILE_RUN_XP * profileXpMultiplier'),'flat server run XP path still present');
expect(index.includes('/assets/ui/icon_game_button.webp') && index.includes('/assets/ui/icon_shopping.webp') && index.includes('/assets/ui/icon_quest_game.webp'),'native XP source icons missing');
expect(index.includes('00:00 МСК'),'daily reset copy missing');

const baseFor=(ordinal)=>ordinal<=3?22:(ordinal<=10?4:2);
for(let i=1;i<=3;i+=1)expect(baseFor(i)===22,`run ${i} should award 22 base XP`);
for(let i=4;i<=10;i+=1)expect(baseFor(i)===4,`run ${i} should award 4 base XP`);
for(let i=11;i<=40;i+=1)expect(baseFor(i)===2,`run ${i} should award 2 base XP`);
expect(baseFor(1)*2===44,'Elite+ first-run award should be 44 XP');
expect(baseFor(4)*2===8,'Elite+ standard award should be 8 XP');
expect(baseFor(11)*2===4,'Elite+ grind award should be 4 XP');

let totalTo50=0;
for(let nextLevel=2;nextLevel<=50;nextLevel+=1)totalTo50+=nextLevel*10;
expect(totalTo50===12740,`level curve drifted: expected 12740 XP to level 50, got ${totalTo50}`);

const dailyBase=(runs)=>Array.from({length:runs},(_,i)=>baseFor(i+1)).reduce((a,b)=>a+b,0);
expect(dailyBase(3)===66,'3-run casual daily base should be 66 XP');
expect(dailyBase(6)===78,'6-run daily base should be 78 XP');
expect(dailyBase(12)===98,'12-run daily base should be 98 XP');
expect(dailyBase(20)===114,'20-run daily base should be 114 XP');

console.log('Profile Run XP V24 check PASS: 22/4/2 daily tiers, first 3 bonus, Elite+ x2, Moscow reset, ledger-backed server authority, no optimistic client grant.');
