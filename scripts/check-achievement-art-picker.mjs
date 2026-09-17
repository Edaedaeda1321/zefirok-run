#!/usr/bin/env node
import fs from 'node:fs';
const owner=fs.readFileSync(new URL('../owner.html',import.meta.url),'utf8');
const checks=[
  ['скрытое поле artUrl', 'id="${prefix}ArtUrl" type="hidden"'],
  ['кнопка выбора картинки', 'data-achievement-art-choose="${index}"'],
  ['открытие общего picker', 'openProjectAssetPicker(`${prefix}ArtUrl`)'],
  ['achievement target распознаётся picker', "const achievementVisual=/^achievementCfg\\d+ArtUrl$/.test(String(targetId||''));"],
  ['picker показывает все assets', "achievementVisual?'Достижения · все assets'"],
  ['понятный заголовок picker', "achievementVisual?'Картинка достижения'"],
  ['ручной URL input убран', 'placeholder="/assets/achievements/badges/....webp"', false],
  ['сохранение artUrl осталось', "artUrl:String($(`${prefix}ArtUrl`)?.value||'').trim()"]
];
let failed=0;
for(const [label,needle,expected=true] of checks){const found=owner.includes(needle);const ok=expected?found:!found;console.log(`${ok?'OK':'FAIL'} ${label}`);if(!ok)failed++;}
if(failed){console.error(`\nПроверка не пройдена: ${failed}`);process.exit(1);}console.log('\nAchievement art picker: OK');
