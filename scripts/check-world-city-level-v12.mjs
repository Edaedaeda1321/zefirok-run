// Version compatibility gate: Mir Zeffi city levels v8 plus New City v10/v11.
// Run after applying patches/world-city-level-compat-v12.patch.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {
 CITY_LEVELS,makeInitialCity,cityStats,claimCityLevelReward,
 reconcileCityProgress,sanitizeCity
} from '../world/engine.js';
import {CATALOG} from '../world/catalog.js';
import {RU} from '../world/ru.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const text=path=>readFileSync(join(root,path),'utf8');
assert.equal(CITY_LEVELS.length,5);
assert.deepEqual(CITY_LEVELS.map(level=>level.reward?.points||0),[0,500,1000,2000,4000]);
for(const kind of ['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square']){
 assert.ok(CATALOG[kind],`${kind} missing from the current catalog`);
 assert.ok(CATALOG[kind].price.points>0,`${kind} has no price`);
 assert.ok(CATALOG[kind].buildMs>0,`${kind} has no construction stages`);
}
for(let level=1;level<=5;level++) assert.equal(typeof RU[`cityLevel${level}`],'string',`City level ${level} is untranslated`);
const city=makeInitialCity();
assert.deepEqual(city.progress,{bestLevel:1,claimedLevels:[]});
assert.equal(cityStats(city,CATALOG).cityLevel,1);
assert.deepEqual(reconcileCityProgress(city,CATALOG).progress,city.progress);
assert.deepEqual(sanitizeCity(city,CATALOG).progress,city.progress);
assert.equal(typeof claimCityLevelReward,'function');
const app=text('world/app.js');
for(const token of ['updateCityLevelUI(stats)','claimCityReward','claimCityLevelReward','buildCitizenScene(state.city,CATALOG,stats.population,Date.now(),stats.comfort)'])
 assert.ok(app.includes(token),`Missing city level UI hook: ${token}`);
for(const html of ['world.html','world/index.html']){
 const content=text(html);
 for(const id of ['cityLevelBadge','cityLevelResidents','cityLevelComfort','cityRewardText','claimCityReward'])
  assert.ok(content.includes(`id="${id}"`),`${html} is missing #${id}; restore the v8 city-level markup`);
}
const server=text('src/zeffi-world-service.js');
for(const token of ["'claim-level'",'reconcileCityProgress','claimCityLevelReward','CITY_LEVELS','if(credit)','await db.batch(statements)'])
 assert.ok(server.includes(token),`Worker world service is missing currency reward integration: ${token}`);
// ESM linking here catches incompatible named imports before the D1 release gate.
await import('../src/zeffi-world-service.js');
console.log('Zeffi World v12 compatibility: city levels + currency grants + New City buildings + UI + service ESM PASS');
