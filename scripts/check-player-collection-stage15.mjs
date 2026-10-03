#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const worker=fs.readFileSync(path.join(root,'src/worker.js'),'utf8');
const rating=fs.readFileSync(path.join(root,'rating.html'),'utf8');
const gate=fs.readFileSync(path.join(root,'scripts/check-production-gate.mjs'),'utf8');
let failed=0;const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const publicItem=between(worker,'function playerCollectionPublicItem','async function playerPublicCollection');
const seasonCatalog=between(worker,'function playerCollectionPublicSeasonCatalog','function playerCollectionSeasonAlbums');
const previewMarkup=between(rating,'function playerCollectionMusicPreviewMarkup','function playerCollectionMusicPreviewButton');
const toggle=between(rating,'async function togglePlayerCollectionMusicPreview','function disconnectPlayerCollectionRarityMotion');

const previewRefs=[...worker.matchAll(/previewUrl:\s*"(\/assets\/sounds\/previews\/[A-Za-z0-9._-]+\.mp3)"/g)].map(match=>match[1]);
const unique=[...new Set(previewRefs)];
check('music catalog exposes dedicated short preview assets',unique.length>=16);
for(const url of unique){
  const file=path.join(root,url.replace(/^\//,''));
  check(`preview asset exists: ${path.basename(file)}`,fs.existsSync(file));
  if(fs.existsSync(file))check(`preview asset is lightweight: ${path.basename(file)}`,fs.statSync(file).size<=300_000);
}
check('public collection exposes preview URL only for music',publicItem.includes('previewUrl:kind==="music"')&&publicItem.includes('previewDurationSeconds:kind==="music"'));
check('season album public items also carry safe music previews',seasonCatalog.includes('previewUrl:kind==="music"')&&seasonCatalog.includes('previewDurationSeconds:kind==="music"'));
check('client validates previews to the dedicated same-origin folder',rating.includes('/^\\/assets\\/sounds\\/previews\\/[A-Za-z0-9._-]+\\.mp3'));
check('music preview is rendered only for music items',previewMarkup.includes('!=="music"')&&previewMarkup.includes('data-rating-player-collection-music-preview-toggle'));
check('music preview tells users audio is lazy loaded',previewMarkup.includes('Аудио загрузится только после нажатия'));
check('audio object is created only after explicit preview click',toggle.includes('const audio=new Audio()')&&toggle.includes('audio.preload="none"'));
check('preview is capped at 15 seconds',rating.includes('PLAYER_COLLECTION_MUSIC_PREVIEW_MAX_SECONDS = 15')&&toggle.includes('Math.min(PLAYER_COLLECTION_MUSIC_PREVIEW_MAX_SECONDS'));
check('preview pauses/resumes without re-fetching collection data',toggle.includes('playerCollectionMusicPreviewAudio.pause()')&&!toggle.includes('api('));
check('preview playback is stopped and released when detail closes',rating.includes('stopPlayerCollectionMusicPreview({reset:true,release:true})')&&rating.includes('function closePlayerCollectionItem'));
check('preview playback is also released when collection closes',between(rating,'function closePlayerCollection(options={})','function cancelPlayerProfileMotion').includes('stopPlayerCollectionMusicPreview({reset:true,release:true})'));
check('waveform UI is playback-driven and does not use WebAudio polling',rating.includes('rating-player-collection-music-wave')&&rating.includes('requestAnimationFrame(playerCollectionMusicPreviewUpdateProgress)')&&!rating.includes('new AudioContext'));
check('Stage 15 adds no extra collection API endpoint',!worker.includes('/api/leaderboard/player-collection/music-preview')&&!rating.includes('PLAYER_COLLECTION_MUSIC_PREVIEW_PATH'));
check('Stage 15 check is wired into production gate',gate.includes("['player collection music previews', 'node', ['scripts/check-player-collection-stage15.mjs']]"));

if(failed){console.error(`Player collection stage 15 failed: ${failed} check(s).`);process.exit(1);}
console.log(`Player collection stage 15 OK: ${unique.length} lazy short music previews are asset-backed and capped at 15 seconds.`);
