#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js');
const rating=read('rating.html');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const itemOpen=between(rating,'function openPlayerCollectionItem(item,trigger=null) {','function closePlayerCollectionItem(options={})');
const profileLoad=between(rating,'async function loadPlayerProfile(targetId,entry,force=false)','function openPlayerProfile(targetId,trigger=null)');

check('endpoint exposes viewer self marker',endpoint.includes('viewer:{ isSelf }'));
check('endpoint exposes viewerOwned per target item',endpoint.includes('viewerOwned:Boolean(itemId&&viewerOwnedByKind.get(kind)?.has(itemId))'));
check('endpoint exposes viewerEquipped per target item',endpoint.includes('viewerEquipped:Boolean(itemId&&playerCollectionActiveId(viewerState,kind)===itemId)'));
check('viewer comparison reads cosmetic columns only',worker.includes('const PLAYER_COLLECTION_STATE_SQL = `SELECT owned_avatars_json,active_avatar_id,owned_frames_json,active_frame_id,owned_trails_json,active_trail_id,owned_skins_json,active_skin_id,owned_music_json,active_music_id FROM case_player_state'));
check('self view reuses target cosmetic state',endpoint.includes('let viewerState=targetState;')&&endpoint.includes('if(!isSelf){'));
check('other-player view performs viewer cosmetic read conditionally',endpoint.includes('const viewerCaseRow=await env.DB.prepare(PLAYER_COLLECTION_STATE_SQL).bind(viewerTelegramId).first();'));
check('public payload still contains only target collection plus viewer booleans',!endpoint.includes('coins')&&!endpoint.includes('marshmallow')&&!endpoint.includes('coffee_balance')&&!endpoint.includes('price'));
check('mini-profile remains free of full collection request',!profileLoad.includes('PLAYER_COLLECTION_PATH'));
check('collection item is an interactive button',rating.includes('data-rating-player-collection-item data-item-kind=')&&rating.includes('type="button" aria-label="Открыть'));
check('grid marks shared items with viewer badge',rating.includes('rating-player-collection-viewer-owned')&&rating.includes('Есть у тебя'));
check('shared-item badge is hidden for self view',rating.includes('playerCollectionData?.viewer?.isSelf!==true&&item?.viewerOwned===true'));
check('detail layer exists inside collection sheet',rating.includes('data-rating-player-collection-detail hidden aria-hidden="true"')&&rating.includes('data-rating-player-collection-detail-content'));
check('detail card shows type rarity and source',itemOpen.includes('playerCollectionKindLabel(kind)')&&itemOpen.includes('rating-player-collection-detail-chip is-rarity')&&(itemOpen.includes('<small>Источник</small>')||itemOpen.includes('${escapeHtml(sourceHeading)}')));
check('target ownership status distinguishes equipped state',itemOpen.includes('item?.equipped===true?"✓ Сейчас выбрано":"✓ Есть в коллекции"'));
check('viewer ownership status distinguishes owned and missing',itemOpen.includes('item?.viewerOwned===true?"✓ Есть в твоей коллекции":"○ У тебя этого предмета нет"'));
check('viewer equipped state is represented',itemOpen.includes('item?.viewerEquipped===true?"✓ Сейчас выбрано"'));
check('self detail removes duplicated viewer column',itemOpen.includes('rating-player-collection-detail-statuses is-self')&&itemOpen.includes('"Твоя коллекция"'));
check('detail opens from already loaded collection payload',rating.includes('Array.isArray(playerCollectionData?.items)?playerCollectionData.items:[]')&&rating.includes('openPlayerCollectionItem(item,itemTrigger)'));
check('detail open does not make another API request',!itemOpen.includes('api(')&&!itemOpen.includes('fetch('));
check('nested detail closes before collection on Escape and rating back',rating.includes('if(playerCollectionDetail&&!playerCollectionDetail.hidden){closePlayerCollectionItem();return;}')&&rating.includes('if(playerCollectionDetail&&!playerCollectionDetail.hidden){ratingSelectHaptic();closePlayerCollectionItem();return;}'));
check('detail image uses existing fail-soft image handling',itemOpen.includes('data-rating-player-collection-image')&&rating.includes('image.matches("[data-rating-player-collection-image]")'));

if(failed){console.error(`Player collection stage 3 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 3 OK: item details + viewer ownership comparison are wired with no extra detail request.');
