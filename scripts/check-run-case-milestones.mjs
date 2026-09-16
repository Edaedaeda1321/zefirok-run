#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const worker=read('src/worker.js');
const index=read('index.html');
const owner=read('owner.html');
const migration=read('migrations/0092_runner_case_drop_milestones.sql');
const manifest=read('src/runtime-schema-manifest.mjs');
const checks=[];
const must=(name,source,needle)=>checks.push({name,ok:source.includes(needle)});
const mustNot=(name,source,needle)=>checks.push({name,ok:!source.includes(needle)});

must('milestone table migration',migration,'CREATE TABLE IF NOT EXISTS game_run_case_drop_milestones');
must('milestone composite primary key',migration,'PRIMARY KEY(run_id, milestone_score)');
must('milestone player index',migration,'idx_game_run_case_drop_milestones_player');
must('runtime manifest table',manifest,"'game_run_case_drop_milestones'");
must('runtime manifest index',manifest,"'idx_game_run_case_drop_milestones_player'");
must('runtime schema fallback table',worker,'CREATE TABLE IF NOT EXISTS game_run_case_drop_milestones');
must('1000 score milestone constant',worker,'const RUN_CASE_DROP_MILESTONE_SCORE = 1000;');
must('milestone sync helper',worker,'async function syncRunCaseDropMilestones');
must('every missing 1000 milestone rolled',worker,'next+=RUN_CASE_DROP_MILESTONE_SCORE');
must('same live chance remains configurable',worker,'Math.random()*10000>=Number(config.chanceBps||0)');
must('same case weights used',worker,"['small','sweet','gold','mythic','legendary']");
must('first 1000 result reserved at run start',worker,'INSERT OR IGNORE INTO game_run_case_drop_milestones(');
must('legacy one-drop import',worker,'async function importLegacyRunCaseDropMilestone');
must('checkpoint generates milestone rolls',worker,'await syncRunCaseDropMilestones(env,{runId,telegramId,score:checkpoint.score,durationMs:checkpoint.durationMs});');
must('checkpoint accepts caught milestones',worker,'caseDropCaughtMilestones||body.case_drop_caught_milestones');
must('milestone-specific grant ids',worker,"'run_case_drop_'||m.run_id||'_'||m.milestone_score");
must('settlement returns caseDrops array',worker,'caseDrop:primaryCaseDrop,caseDrops:settlementCaseDrops');
must('client stores multiple case drops',index,'runCaseDrops: []');
must('client tracks caught milestones',index,'runCaseDropCaughtMilestones: []');
must('client forces checkpoint every 1000',index,'const reachedCaseMilestone=Math.floor(Math.max(0,Number(state.score||0))/1000)*1000;');
must('client receives checkpoint caseDrops',index,'mergeServerRunCaseDrops(data.checkpoint.caseDrops)');
must('client spawns next eligible case',index,'function spawnNextReservedCaseDrop()');
must('pickup carries milestone score',index,'milestoneScore:Number(drop.milestoneScore||drop.minScore||1000)');
must('settlement submits caught milestones',index,'caseDropCaughtMilestones: currentRunCaseDropCaughtMilestones()');
must('results support multiple cases',index,'const grantedCaseDrops=Array.isArray(settlement?.caseDrops)');
must('owner explains every 1000',owner,'Каждые 1 000 очков сервер делает новый независимый ролл.');
must('owner chance is per milestone',owner,'Шанс кейса на каждые 1 000 очков, %');
mustNot('old max-one-case owner copy removed',owner,'максимум один кейс на забег');

const failed=checks.filter(x=>!x.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
if(failed.length){console.error(`\nRunner case milestone checks failed: ${failed.length}/${checks.length}`);process.exit(1);}
console.log(`\nRunner case milestone checks passed: ${checks.length} invariants.`);
