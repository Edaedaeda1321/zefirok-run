#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js'),rating=read('rating.html'),gate=read('scripts/check-production-gate.mjs');
let failed=0; const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const compareItems=between(rating,'function playerCollectionComparisonItems(data,compareMode=playerCollectionCompareMode) {','function playerCollectionComparisonMarkup');
const compareMarkup=between(rating,'function playerCollectionComparisonMarkup(data,activeMode) {','function playerCollectionFindItem');
const render=between(rating,'function renderPlayerCollection(data,activeTab=playerCollectionTab) {','function beginPlayerCollectionShowcaseEdit');
const handler=between(rating,'playerCollectionLayer?.addEventListener("click",event=>{','playerCollectionLayer?.addEventListener("change"');

check('server computes viewer public collection only for other-player comparison',endpoint.includes('isSelf?Promise.resolve(null):playerPublicCollection(env,viewerState')&&endpoint.includes('viewerCollection'));
check('server reuses the same release snapshot for target and viewer collections',endpoint.includes('releaseRules:releaseSnapshot.rows')&&endpoint.match(/releaseRules:releaseSnapshot\.rows/g)?.length>=2);
check('viewer-only items are derived by subtracting target ownership',endpoint.includes('viewerOnlyItems=isSelf?[]')&&endpoint.includes('!targetOwnedByKind.get(kind)?.has(itemId)'));
check('comparison payload exposes only aggregate counts plus viewer-only item details',endpoint.includes('commonCount')&&endpoint.includes('targetOnlyCount')&&endpoint.includes('viewerOnlyCount')&&endpoint.includes('viewerOnlyItems'));
check('self view does not expose a comparison payload with viewer-only cosmetics',endpoint.includes('comparison:isSelf?{available:false,isSelf:true')&&endpoint.includes('viewerOnlyItems:[]'));
check('frontend offers all four Stage 8 modes',rating.includes('{id:"all",label:"Все"}')&&rating.includes('{id:"common",label:"Есть у обоих"}')&&rating.includes('{id:"target_only",label:"Только у игрока"}')&&rating.includes('{id:"viewer_only",label:"Только у тебя"}'));
check('common mode filters target items by viewer ownership',compareItems.includes('compareMode==="common"')&&compareItems.includes('item?.viewerOwned===true'));
check('target-only mode filters target items missing from viewer',compareItems.includes('compareMode==="target_only"')&&compareItems.includes('item?.viewerOwned!==true'));
check('viewer-only mode uses server-provided viewer-only items',compareItems.includes('compareMode==="viewer_only"')&&compareItems.includes('comparison?.viewerOnlyItems'));
check('comparison UI shows counts without fetching again',compareMarkup.includes('commonCount')&&compareMarkup.includes('targetOnlyCount')&&compareMarkup.includes('viewerOnlyCount')&&!compareMarkup.includes('api(')&&!compareMarkup.includes('fetch('));
check('category tabs and Stage 7 filters compose over active comparison mode',render.includes('playerCollectionComparisonItems(data,playerCollectionCompareMode)')&&render.includes('scopeItems=playerCollectionTab==="all"?baseItems')&&render.includes('playerCollectionMatchesFilter'));
check('viewer-only card is visibly distinguished',rating.includes('rating-player-collection-viewer-only')&&rating.includes('Только у тебя'));
check('viewer-only detail explicitly shows that target player is missing the item',rating.includes('○ У игрока этого предмета нет')&&rating.includes('targetOwned=item?.owned!==false'));
check('detail lookup can resolve both target and viewer-only payload items',rating.includes('function playerCollectionFindItem')&&rating.includes('data?.comparison?.viewerOnlyItems'));
check('comparison click rerenders loaded payload without collection API request',handler.includes('data-rating-player-collection-compare')&&handler.includes('renderPlayerCollection(playerCollectionData,"all")')&&!handler.includes('PLAYER_COLLECTION_PATH'));
check('self view forces comparison mode back to all',render.includes('if(isSelf||playerCollectionSeasonKey)playerCollectionCompareMode="all"'));
check('comparison mode resets on collection open and close',rating.match(/playerCollectionCompareMode="all"/g)?.length>=4);
check('stage 8 check is wired into production gate',gate.includes("['player collection comparison', 'node', ['scripts/check-player-collection-stage8.mjs']]"));

if(failed){console.error(`Player collection stage 8 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 8 OK: comparison is server-bounded, privacy-safe and local after the lazy collection load.');
