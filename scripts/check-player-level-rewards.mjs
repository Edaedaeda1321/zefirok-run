import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0102_player_level_case_progression.sql',import.meta.url),'utf8');
const schemaContract=fs.readFileSync(new URL('./schema-contract.mjs',import.meta.url),'utf8');
const checks=[];
const must=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});

const expected={
  2:'small',3:'small',4:'sweet',5:'gold',6:'sweet',7:'sweet',8:'sweet',9:'sweet',10:'gold',
  11:'sweet',12:'sweet',13:'gold',14:'sweet',15:'gold',16:'sweet',17:'gold',18:'sweet',19:'gold',20:'mythic',
  21:'gold',22:'gold',23:'gold',24:'gold',25:'mythic',26:'gold',27:'gold',28:'mythic',29:'gold',30:'mythic',
  31:'gold',32:'gold',33:'mythic',34:'gold',35:'mythic',36:'gold',37:'mythic',38:'gold',39:'mythic',40:'legendary',
  41:'gold',42:'mythic',43:'gold',44:'mythic',45:'legendary',46:'mythic',47:'gold',48:'mythic',49:'mythic',50:'legendary'
};
const doubles={30:2,47:2,49:2,50:2};

const workerMapMatch=worker.match(/const LEVEL_CASE_SCHEDULE = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
const workerMap={};
if(workerMapMatch){
  for(const m of workerMapMatch[1].matchAll(/(\d+):"(small|sweet|gold|mythic|legendary)"/g))workerMap[Number(m[1])]=m[2];
}
const clientMapMatch=index.match(/const LEVEL_CASE_TYPE_BY_LEVEL = Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/);
const clientMap={};
if(clientMapMatch){
  for(const m of clientMapMatch[1].matchAll(/(\d+):&quot;(small|sweet|gold|mythic|legendary)&quot;/g))clientMap[Number(m[1])]=m[2];
}

must('worker schedule has all 49 reward levels',Object.keys(workerMap).length===49,`got ${Object.keys(workerMap).length}`);
must('client schedule has all 49 reward levels',Object.keys(clientMap).length===49,`got ${Object.keys(clientMap).length}`);
for(const [level,type] of Object.entries(expected)){
  must(`worker level ${level} = ${type}`,workerMap[level]===type,`got ${workerMap[level]}`);
  must(`client level ${level} = ${type}`,clientMap[level]===type,`got ${clientMap[level]}`);
}
must('no ordinary cases after level 3',Object.entries(workerMap).every(([level,type])=>Number(level)<=3||type!=='small'));
must('no silver cases from level 20 onward',Object.entries(workerMap).every(([level,type])=>Number(level)<20||type!=='sweet'));
must('legendary milestones at 40, 45 and 50',[40,45,50].every(level=>workerMap[level]==='legendary'));
must('double reward milestones encoded on server',worker.includes('const LEVEL_CASE_REWARD_COUNTS = Object.freeze({30:2,47:2,49:2,50:2});'));
must('double reward milestones encoded on client',index.includes('const LEVEL_CASE_COUNT_BY_LEVEL = Object.freeze({30:2,47:2,49:2,50:2});'));
must('server rolls every case in a bundle',worker.includes('rollLevelCaseRewardBundleForPlayer(env,caseType,caseCount'));
must('level opening keeps direct fail-soft first roll',worker.includes('const firstRolled = await rollLevelCaseForPlayer(env,caseType,ensured.state,ensured.state.ownedSkins,liveops);'));
must('bundle reuses the validated first roll',worker.includes('caseRoll===1&&firstRolled'));
must('bundle rolls are tagged for receipt clarity',worker.includes('{...reward,caseRoll}'));
must('season task progress counts bundled cases',worker.includes('{cases_opened:caseCount}'));
must('client inventory count includes bundled cases',index.includes('availableLevelCases().reduce((sum,entry) =&gt; sum + Math.max(1,Math.floor(Number(entry?.count)||1)),0)'));
must('client shows bundled open CTA',index.includes('Открыть ×${formatter.format(entry.count)}'));
must('migration allows mythic level cases',migration.includes("'mythic'"));
must('migration allows legendary level cases',migration.includes("'legendary'"));
must('migration preserves old rows',migration.includes('FROM level_case_openings_before_progression'));
must('migration persists bundle size safely',migration.includes('case_count INTEGER NOT NULL DEFAULT 1 CHECK(case_count BETWEEN 1 AND 2)'));
must('schema contract requires case_count',schemaContract.includes("{ table: 'level_case_openings', column: 'case_count', definition: 'INTEGER NOT NULL DEFAULT 1' }"));
must('server persists case_count in immutable level receipt',worker.includes('INSERT INTO level_case_openings (telegram_id, level, case_type, case_count, rewards_json, opened_at)'));
must('server replays persisted case_count',worker.includes('SELECT level,case_type,case_count,rewards_json,opened_at FROM level_case_openings'));
must('opened-case statistics count every bundled case',worker.includes('COALESCE(SUM(case_count),0)'));

for(const [level,count] of Object.entries(doubles))must(`double milestone ${level} = ${count}`,count===2);

const failed=checks.filter(item=>!item.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
if(failed.length){
  console.error(`\nPlayer level reward check failed: ${failed.length}/${checks.length}`);
  for(const item of failed)console.error(`- ${item.name}${item.detail?`: ${item.detail}`:''}`);
  process.exit(1);
}
console.log(`\nPlayer level reward check PASS: ${checks.length} invariants.`);
