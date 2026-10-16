import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignResidentThoughts} from '../resident-thoughts.js';
import {buildCitizenScene,sampleCitizenScene} from '../citizens.js';
import {makeInitialCity,cityStats} from '../engine.js';
import {CATALOG} from '../catalog.js';

const request=(id,speaker,status='active')=>({id:`resident-${id}`,templateId:id,speaker,status,objective:`Помоги жителю ${speaker}`});
const mia=request('flowers','Мия'),leya=request('park','Лея'),tim=request('road','Тим');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('thoughts map to existing citizens only, respecting the smallest player city',()=>{
 const town=makeInitialCity(),stats=cityStats(town,CATALOG);
 const scene=buildCitizenScene(town,CATALOG,stats.population,Date.now(),stats.comfort);
 assert.equal(scene.routes.length,2,'both starter residents have visible walkers');
 const shown=assignResidentThoughts([mia,leya],scene.routes);
 assert.equal(shown.length,2,'two real residents can show two server-backed requests');
 assert.equal(shown[0].citizenId,scene.routes[0].id);
 assert.equal(shown[0].request.id,mia.id);
 assert.deepEqual(shown.map(x=>x.citizenId),['citizen-0','citizen-1']);
 assert.deepEqual(shown.map(x=>x.request.id),[mia.id,leya.id]);
 assert.ok(sampleCitizenScene(scene).some(c=>c.id===shown[0].citizenId));
 assert.deepEqual(assignResidentThoughts([mia,leya],[]),[]);
});

test('new server-ready rewards get visual priority; no made-up completion',()=>{
 const assigned=assignResidentThoughts([mia,{...leya,status:'ready'}],[{id:'citizen-0'}]);
 assert.deepEqual(assigned.map(x=>x.request.id),[leya.id]);
 assert.equal(assigned[0].request.status,'ready');
 assert.equal(mia.status,'active','the UI cannot mark a request as ready');
});

test('two distinct wishes bind to two separate walkers, remaining stable as the city grows',()=>{
 const routes=Array.from({length:4},(_,i)=>({id:`citizen-${i}`}));
 const thoughts=assignResidentThoughts([mia,leya],routes);
 assert.deepEqual(thoughts.map(x=>x.citizenId),['citizen-0','citizen-1']);
 assert.deepEqual(assignResidentThoughts([mia,leya],routes).map(x=>x.citizenId),['citizen-0','citizen-1']);
 const second=assignResidentThoughts([tim,leya],routes);
 assert.deepEqual(second.map(x=>x.citizenId),['citizen-2','citizen-1']);
 assert.equal(new Set(second.map(x=>x.citizenId)).size,second.length);
});

test('thoughts never render claimed or forged/out-of-budget requests',()=>{
 assert.deepEqual(assignResidentThoughts([{...mia,status:'claimed'}],['citizen-0']),[]);
 assert.deepEqual(assignResidentThoughts([{...mia,id:undefined}],['citizen-0']),[]);
 assert.equal(assignResidentThoughts([mia,leya,tim],['citizen-0','citizen-1','citizen-2']).length,2);
 assert.deepEqual(assignResidentThoughts([mia],null),[]);
});

test('production wiring retains the existing server claim and build/catalog navigation',()=>{
 const source=read('../app.js'),ui=read('../resident-requests-ui.js'),thoughts=read('../resident-thoughts.js');
 const server=read('../../src/zeffi-resident-requests.js');
 const styles=read('../resident-thoughts.css'),host=read('../../world.html');
 assert.match(source,/residentThoughts\?\.update\(data\)/);
 assert.match(source,/residentThoughts\?\.paint\(citizens/);
 assert.match(source,/residentUI\?\.focusRequest\(item\.id\)/);
 assert.match(source,/serverRequest\('resident\/claim'/);
 assert.match(source,/cityGuideAction\(\{type:'build',itemId:item\.itemId\}\)/);
 assert.match(ui,/data[sS]et\.requestId|dataset\.requestId/);
 assert.match(thoughts,/isoToScreen\(citizen\.x,citizen\.y,size,camera\)/);
 assert.match(thoughts,/getBoundingClientRect/);
 assert.match(styles,/prefers-reduced-motion/);
 assert.match(host,/resident-thoughts\.css/);
 assert.match(server,/profile_guard/);
 assert.doesNotMatch(thoughts,/fetch\(|localStorage|indexedDB|XMLHttpRequest/);
 assert.doesNotMatch(thoughts,/update.*wallet|MutationStatements/);
});
