#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const rating=read('rating.html');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

check('mini-profile collection card is interactive',rating.includes('data-rating-player-collection-open')&&rating.includes('aria-haspopup="dialog"'));
check('full collection dialog exists',rating.includes('data-rating-player-collection hidden role="dialog"')&&rating.includes('data-rating-player-collection-content'));
check('collection API path is wired',rating.includes('const PLAYER_COLLECTION_PATH = "/api/leaderboard/player-collection";'));
check('collection loads lazily from card',rating.includes('function openPlayerCollection(targetId,trigger=null)')&&rating.includes('void loadPlayerCollection(id,false);'));
const profileLoad=between(rating,'async function loadPlayerProfile(targetId,entry,force=false)','function openPlayerProfile(targetId,trigger=null)');
check('mini-profile open still does not fetch full collection',!profileLoad.includes('PLAYER_COLLECTION_PATH'));
check('collection request is cached for five minutes',rating.includes('const PLAYER_COLLECTION_CACHE_TTL_MS = 5 * 60 * 1000;')&&rating.includes('const playerCollectionCache = new Map();'));
check('collection has all public cosmetic tabs',['skin','avatar','frame','trail','music'].every(kind=>rating.includes(`{id:"${kind}"`)));
check('tab changes filter existing payload without refetch',rating.includes('items.filter(item=>String(item?.kind||"")===playerCollectionTab)')&&rating.includes('renderPlayerCollection(playerCollectionData,next)'));
check('collection cards show server metadata',rating.includes('item?.rarityLabel')&&rating.includes('item?.source?.label')&&rating.includes('item?.equipped===true'));
check('collection image fallback is fail-soft',rating.includes('data-rating-player-collection-image')&&rating.includes('image.src=fallback'));
check('collection request aborts on close',rating.includes('function closePlayerCollection(options={})')&&rating.includes('playerCollectionRequest?.abort?.();playerCollectionRequest=null;'));
check('closing mini-profile closes nested collection first',rating.includes('closePlayerCollection({returnFocus:false});\n    stopPublicStreakMotion();'));
check('escape closes collection before mini-profile',rating.includes('if(playerCollectionLayer&&!playerCollectionLayer.hidden){closePlayerCollection();return;}'));
check('rating back closes nested collection before leaving rating',rating.includes('if(playerCollectionLayer&&!playerCollectionLayer.hidden){ratingSelectHaptic();closePlayerCollection();return;}'));
check('reduced motion covers collection sheet',rating.includes('.rating-player-collection-layer,.rating-player-collection-sheet,.rating-player-collection-summary'));

if(failed){console.error(`Player collection stage 2 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 2 OK: lazy full collection sheet, category tabs, cached read and safe modal lifecycle are wired.');
