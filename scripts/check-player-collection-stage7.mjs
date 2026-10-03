#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const rating=read('rating.html');
const worker=read('src/worker.js');
const gate=read('scripts/check-production-gate.mjs');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const filters=between(rating,'function playerCollectionFiltersMarkup(data,activeFilter) {','function playerCollectionSortMarkup');
const filterLogic=between(rating,'function playerCollectionMatchesFilter(item,filter) {','function playerCollectionSortedItems');
const sortLogic=between(rating,'function playerCollectionSortedItems(items,sortMode) {','function playerCollectionMotionReduced');
const render=between(rating,'function renderPlayerCollection(data,activeTab=playerCollectionTab) {','async function loadPlayerCollection');
const open=between(rating,'function openPlayerCollection(targetId,trigger=null) {','function closePlayerCollection(options={})');
const close=between(rating,'function closePlayerCollection(options={}) {','function cancelPlayerProfileMotion');
const clickHandler=between(rating,'playerCollectionLayer?.addEventListener("click",event=>{','playerCollectionLayer?.addEventListener("error"');
const css=between(rating,'<style id="rating-player-collection-stage6-7">','</style>');

check('stage 7 exposes requested quick filters',rating.includes('{id:"legendary",label:"Легендарные"}')&&rating.includes('{id:"archived",label:"Архив"}')&&rating.includes('{id:"equipped",label:"Выбрано"}')&&rating.includes('{id:"viewer_owned",label:"Есть у меня"')&&rating.includes('{id:"viewer_missing",label:"Нет у меня"'));
check('viewer ownership filters are hidden on self view',filters.includes('!filter.viewerOnly||!isSelf'));
check('legendary filter uses actual rarity id',filterLogic.includes('filter==="legendary"')&&filterLogic.includes('item?.rarity'));
check('archive filter uses server availability status',filterLogic.includes('filter==="archived"')&&filterLogic.includes('item?.availability?.status'));
check('equipped filter uses target equipped state',filterLogic.includes('filter==="equipped"')&&filterLogic.includes('item?.equipped===true'));
check('viewer owned/missing filters use stage 3 booleans',filterLogic.includes('item?.viewerOwned===true')&&filterLogic.includes('item?.viewerOwned!==true'));
check('sorting offers rarity player rarity and name',rating.includes('{id:"rarity",label:"По редкости"}')&&rating.includes('{id:"player_rarity",label:"Редчайшие у игроков"}')&&rating.includes('{id:"name",label:"По названию"}'));
check('player-rarity sort puts known aggregate rarity first',sortLogic.includes('leftKnown!==rightKnown')&&sortLogic.includes('return leftKnown?-1:1'));
check('player-rarity sort orders by ownership percent ascending',sortLogic.includes('ownershipPercent')&&sortLogic.includes('Number(left?.playerRarity?.ownershipPercent||0)-Number(right?.playerRarity?.ownershipPercent||0)'));
check('default sort preserves the canonical rarity hierarchy',rating.includes('PLAYER_COLLECTION_RARITY_ORDER')&&sortLogic.includes('PLAYER_COLLECTION_RARITY_ORDER'));
check('category tab and quick filter are composed locally',render.includes('scopeItems=playerCollectionTab==="all"')&&render.includes('scopeItems.filter(item=>playerCollectionMatchesFilter'));
check('filter and sort operate on loaded payload without API requests',!filterLogic.includes('api(')&&!filterLogic.includes('fetch(')&&!sortLogic.includes('api(')&&!sortLogic.includes('fetch('));
check('filter UI shows result count and reset action',render.includes('filtered.length')&&render.includes('data-rating-player-collection-filter-reset'));
check('filter state resets on collection open and close',open.includes('playerCollectionFilter="all"')&&open.includes('playerCollectionSort="rarity"')&&close.includes('playerCollectionFilter="all"')&&close.includes('playerCollectionSort="rarity"'));
check('click handler rerenders filters without refetch',clickHandler.includes('data-rating-player-collection-filter')&&clickHandler.includes('renderPlayerCollection(playerCollectionData,playerCollectionTab)'));
check('sort change rerenders existing payload',rating.includes('data-rating-player-collection-sort')&&rating.includes('playerCollectionLayer?.addEventListener("change"'));
check('stage 7 controls are horizontally safe for mobile',css.includes('.rating-player-collection-filters')&&css.includes('overflow-x:auto'));
check('stage 7 does not change collection server authority',!worker.includes('PLAYER_COLLECTION_FILTERS')&&!worker.includes('PLAYER_COLLECTION_SORTS'));
check('stage 7 check is wired into production gate',gate.includes("['player collection filters and sorting', 'node', ['scripts/check-player-collection-stage7.mjs']]"));

if(failed){console.error(`Player collection stage 7 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 7 OK: category + quick filters + sorting are local to the lazy-loaded collection payload and add no requests.');
