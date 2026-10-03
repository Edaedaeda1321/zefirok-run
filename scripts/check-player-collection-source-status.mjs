#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js');
const rating=read('rating.html');
const gate=read('scripts/check-production-gate.mjs');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const acquisition=between(worker,'function playerCollectionAcquisitionView(item, acquisition) {','function playerCollectionPublicSource(kind, itemId, definition, future) {');
const baseline=between(worker,'function albumAcquisitionBaselineSources(){','function albumAcquisitionFallback()');
const howTo=between(rating,'function playerCollectionHowToGetMarkup(item) {','function playerCollectionHistoryMarkup(item) {');
const open=between(rating,'function openPlayerCollectionItem(item,trigger=null) {','function closePlayerCollectionItem(options={})');
const availabilityClass=between(rating,'function playerCollectionAvailabilityClass(status) {','function playerCollectionSourceCountLabel');

check('incomplete discovery with known provenance gets a dedicated known status',acquisition.includes('else if(provenanceKnown)status="known"'));
check('known provenance is not labelled as availability unknown',acquisition.includes('known:"Источники подтверждены"')&&acquisition.includes('unknown:"Доступность уточняется"'));
check('true unknown remains reserved for items without discovered provenance',acquisition.includes('const provenanceKnown=sources.length>0')&&acquisition.indexOf('else if(provenanceKnown)status="known"')>acquisition.indexOf('else if(acquisition?.complete===true)status="unavailable"'));
check('API distinguishes provenance knowledge from current availability knowledge',acquisition.includes('provenanceKnown,currentAvailabilityKnown:!["known","unknown"].includes(status)'));
check('existing canObtainNow remains boolean-compatible',acquisition.includes('canObtainNow:status==="available"'));
check('cold case fallback explains that provenance remains valid when LiveOps toggles a case',baseline.includes('LiveOps')&&baseline.includes('не меняя происхождение предмета'));
check('rating supports the new known state',availabilityClass.includes('"known"'));
check('known state detail chip says source is known instead of availability pending',open.includes('availabilityStatus==="known"?"Источник известен":availabilityLabel'));
check('known state how-to header becomes ways to obtain',howTo.includes('provenanceKnown?"Способы получения":label'));
check('known state badge shows source count',howTo.includes('playerCollectionSourceCountLabel(sources.length)'));
check('known provenance does not show the old cautious global warning',howTo.includes("!['archived','known'].includes(status)")&&!howTo.includes('статус показан осторожно'));
check('genuinely missing provenance still has a fail-soft message',howTo.includes('Не удалось определить способ получения'));
check('known status has dedicated neutral-positive styling',rating.includes('.rating-player-collection-detail-chip.is-availability.is-known')&&rating.includes('.rating-player-collection-detail-section-badge.is-known'));
check('source status regression check is wired into production gate',gate.includes("['player collection source status UX', 'node', ['scripts/check-player-collection-source-status.mjs']]"));

if(failed){console.error(`Player collection source status UX failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection source status UX OK: confirmed provenance is no longer presented as uncertain availability.');
