import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const owner=fs.readFileSync(new URL('../owner.html',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const checks=[];
const must=(name,haystack,needle)=>checks.push({name,ok:haystack.includes(needle),detail:needle});

must('runner builder schema v9',worker,'RUNNER_BUILDER_CONFIG_VERSION = 9');
must('server dialogue line cap',worker,'RUNNER_BUILDER_MAX_DIALOGUE_LINES = 6');
must('server normalizes dialogue speaker',worker,"speaker:String(rawLine?.speaker||'npc')==='player'?'player':'npc'");
must('server clamps dialogue duration',worker,'runnerBuilderNum(rawLine?.durationSec,1.2,4,2.4)');
must('server keeps legacy speech compatibility',worker,"if(encounterTypeRaw==='speech'&&!dialogue.length&&encounterText)dialogue.push({speaker:'npc',text:encounterText,durationSec:3.15});");
must('public config sends dialogue',worker,'dialogue:(Array.isArray(item?.encounterEvent?.dialogue)?item.encounterEvent.dialogue:[])');

must('owner exposes dialogue event',owner,"{id:'speech',title:'Диалог'}");
must('owner can add dialogue lines',owner,'id="rbNpcDialogueAdd"');
must('owner speaker selector',owner,'data-rb-dialogue-speaker');
must('owner duration control',owner,'data-rb-dialogue-duration');
must('owner persists dialogue array',owner,"dialogue:eventType==='speech'?dialogueRows:[]");
must('owner validates empty dialogue lines',owner,"Заполни текст всех реплик или удали пустые.");

must('client normalizes dialogue',index,'const encounterDialogue = (Array.isArray(encounterRaw.dialogue) ? encounterRaw.dialogue : []).slice(0, 6)');
must('client has dialogue timeline',index,'function runnerNpcCurrentDialogueLine(actor, age)');
must('client holds npc movement during multi-line dialogue',index,'function runnerNpcDialogueHoldsMovement(actor)');
must('client preserves game time while npc movement is held',index,'if (!runnerNpcDialogueHoldsMovement(actor)) actor.movementElapsed');
must('client anchors player speech to player',index,'const playerSpeaker = activeLine.speaker === &quot;player&quot;;');
must('client event includes dialogue payload',index,'dialogue:Array.isArray(actor.encounterDialogue)?actor.encounterDialogue:[]');

const sample=[
  {speaker:'npc',text:'Привет!',durationSec:2.4},
  {speaker:'player',text:'Привет!',durationSec:1.8},
  {speaker:'npc',text:'Догоняй!',durationSec:2.2}
];
const total=sample.reduce((sum,line)=>sum+Math.max(1.2,Math.min(4,Number(line.durationSec)||2.4)),0);
checks.push({name:'sample dialogue timeline',ok:Math.abs(total-6.4)<1e-9,detail:`expected 6.4, got ${total}`});

const failed=checks.filter(item=>!item.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
if(failed.length){
  console.error(`\nRunner dialogue check failed: ${failed.length}/${checks.length}`);
  for(const item of failed)console.error(`- ${item.name}: ${item.detail}`);
  process.exit(1);
}
console.log(`\nRunner dialogue check PASS: ${checks.length} invariants.`);
