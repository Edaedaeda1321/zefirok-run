#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js');
const rating=read('rating.html');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}

check('public collection route',worker.includes('url.pathname === "/api/leaderboard/player-collection"'));
check('collection route performance tag',worker.includes('"leaderboard_player_collection", () => leaderboardPlayerCollection(request, env)'));
check('collection endpoint validates public rating player',worker.includes('async function leaderboardPlayerCollection(request, env)')&&worker.includes('Игрок сейчас не отображается в этом рейтинге.'));
check('collection reads existing cosmetic ownership only',worker.includes('SELECT owned_avatars_json,active_avatar_id,owned_frames_json,active_frame_id,owned_trails_json,active_trail_id,owned_skins_json,active_skin_id,owned_music_json,active_music_id FROM case_player_state'));
check('collection excludes default-owned cosmetics',worker.includes('definition?.defaultOwned === true'));
check('collection hides never-released future content',worker.includes('!rule?.released && !rule?.everReleased')&&worker.includes('readLiveContentReleaseRules(env)'));
check('historical released cosmetics remain public',worker.includes('rule?.everReleased'));
check('collection includes rarity/source/equipped metadata',worker.includes('rarityLabel:String(PLAYER_COLLECTION_RARITY_LABELS[rarity]||"Особый")')&&worker.includes('source:playerCollectionPublicSource(kind,itemId,definition,future)')&&worker.includes('equipped:playerCollectionActiveId(state,kind)===itemId'));
check('mini-profile response includes summary',worker.includes('collectionSummary=(await playerPublicCollection(env,caseStateFromRow(caseRow||{}))).summary')&&worker.includes('collectionSummary,\n      comparison'));
check('mini-profile summary uses same existing D1 read',worker.includes('optionalFirst(env.DB.prepare(`SELECT owned_avatars_json,active_avatar_id,owned_frames_json,active_frame_id,owned_trails_json,active_trail_id,owned_skins_json,active_skin_id,owned_music_json,active_music_id FROM case_player_state WHERE telegram_id=? LIMIT 1`).bind(targetTelegramId))'));
check('rating renders collection summary',rating.includes('rating-player-collection-summary')&&rating.includes('const collection=data?.collectionSummary||{}'));
check('rating does not add collection API call on mini-profile open',!rating.includes('/api/leaderboard/player-collection'));
check('collection card uses existing asset',rating.includes('const PLAYER_COLLECTION_ICON = "/assets/ui/new_avatars_game.webp";'));

if(failed){console.error(`Player collection stage 1 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 1 OK: public server contract + zero-extra-request mini-profile summary are wired.');
