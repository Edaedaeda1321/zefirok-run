import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../catalog.js';
import {
  makeInitialCity, cloneCity, addObject, sanitizeCity, rotateLocalPoint,
  chunkAt, inBounds, canBuyParcel, expansionCandidates, expansionPrice,
  buyParcel, topUpTestWallet, checkPlacement, applyRoadStroke,
  isConstructing, constructionSkipPrice, skipConstruction, BuildError
} from '../engine.js';
const seed = () => makeInitialCity();
const fail = (work,code) => assert.throws(work,error=>error instanceof BuildError && error.code===code);

test('rotating buildings rotates actual asymmetric facade anchor even for square buildings',()=>{
  const p={u:.2,v:.8,w:2,h:2};
  assert.deepEqual(rotateLocalPoint(p.u,p.v,p.w,p.h,0),{x:.2,y:.8});
  assert.deepEqual(rotateLocalPoint(p.u,p.v,p.w,p.h,1),{x:1.2,y:.2});
  assert.deepEqual(rotateLocalPoint(p.u,p.v,p.w,p.h,2),{x:1.8,y:1.2});
  assert.deepEqual(rotateLocalPoint(p.u,p.v,p.w,p.h,3),{x:.8,y:1.8});
  assert.deepEqual(rotateLocalPoint(2,1,3,2,1),{x:1,y:2});
});

test('new parcels must touch owned territory and may extend on every side',()=>{
  let c=seed();
  assert.equal(c.parcels.length,0);
  assert.equal(canBuyParcel(c,6,2),true);
  assert.equal(canBuyParcel(c,-1,2),true);
  assert.equal(canBuyParcel(c,2,-1),true);
  assert.equal(canBuyParcel(c,2,6),true);
  assert.equal(canBuyParcel(c,9,9),false);
  fail(()=>buyParcel(c,9,9),'INVALID_PARCEL');
  const before=c.wallet.points;
  c=buyParcel(c,6,2);
  assert.equal(c.parcels.length,1);
  assert.equal(c.wallet.points,before-expansionPrice(seed()).points);
  assert.equal(inBounds(c,24,8),true);
  assert.equal(inBounds(c,27,11),true);
  assert.equal(inBounds(c,28,11),false);
  assert.equal(canBuyParcel(c,7,2),true);
  fail(()=>buyParcel(c,6,2),'INVALID_PARCEL');
});

test('every new 4x4 parcel doubles the price: 1x, 2x, 4x, 8x',()=>{
  let c=seed();
  const base=expansionPrice(c);
  const positions=[[6,2],[7,2],[8,2],[9,2]];
  for(let i=0;i<positions.length;i++){
    const price=expansionPrice(c);
    assert.deepEqual(price,{points:base.points*(2**i),coffee:0,treats:base.treats*(2**i)});
    const before={...c.wallet};
    c=buyParcel(c,...positions[i]);
    assert.equal(c.wallet.points,before.points-price.points);
    assert.equal(c.wallet.treats,before.treats-price.treats);
    assert.equal(c.parcels.length,i+1);
    const restored=sanitizeCity(JSON.parse(JSON.stringify(c)),CATALOG);
    assert.deepEqual(expansionPrice(restored),expansionPrice(c));
  }
  assert.equal(expansionPrice(c).points,base.points*16);
});

test('parcel expansions are repeatable without fixed map size cap',()=>{
  let c=seed();
  c.wallet.points=3_000_000_000;
  c.wallet.treats=30_000_000;
  for(let i=6;i<27;i++){
    c=buyParcel(c,i,2);
  }
  assert.equal(c.size,24);
  assert.equal(c.parcels.length,21);
  assert.equal(inBounds(c,26*4+2,2*4+2),true);
  assert.equal(inBounds(c,27*4,2*4),false);
  const restored=sanitizeCity(JSON.parse(JSON.stringify(c)),CATALOG);
  assert.deepEqual(restored,c);
});

test('land purchases charge sandbox points and treats together, not live game wallet',()=>{
  let c=seed();
  c.wallet.points=expansionPrice(c).points-1;
  fail(()=>buyParcel(c,6,2),'INSUFFICIENT_BALANCE');
  c.wallet.points=expansionPrice(c).points;
  c.wallet.treats=expansionPrice(c).treats-1;
  fail(()=>buyParcel(c,6,2),'INSUFFICIENT_BALANCE');
  const before=cloneCity(c);
  assert.equal(before.parcels.length,0);
  assert.equal(before.wallet.points,c.wallet.points);
});

test('construction and roads work in new parcels, including negative coordinates',()=>{
  let c=buyParcel(seed(),-1,2);
  assert.equal(checkPlacement(c,CATALOG,'cottage',-4,8).ok,true);
  c=addObject(c,CATALOG,'cottage',-4,8);
  assert.equal(c.objects.at(-1).x,-4);
  c=applyRoadStroke(c,CATALOG,[{x:-4,y:10},{x:-3,y:10}]);
  assert.ok(c.roads.includes('-4,10'));
  assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(c)),CATALOG),c);
});

test('legacy v0.1.1 save migrates without losing buildings or construction timers',()=>{
  let c=addObject(seed(),CATALOG,'villa',16,18,0,1800000000000);
  const ready=c.objects.at(-1).buildReadyAt;
  delete c.wallet;delete c.parcels;c.version=1;
  const restored=sanitizeCity(c,CATALOG);
  assert.equal(restored.version,2);
  assert.equal(restored.objects.at(-1).buildReadyAt,ready);
  assert.deepEqual(restored.parcels,[]);
  assert.ok(restored.wallet.points>0);
});

test('buildings cost 70 coffee at start; each full minute reduces price by 25, minimum 5',()=>{
  const start=1800000000000;
  const original=addObject(seed(),CATALOG,'villa',16,17,0,start);
  const item=original.objects.at(-1);
  for(const [elapsed,expected] of [[0,70],[59_999,70],[60_000,45],[119_999,45],
    [120_000,20],[180_000,5],[240_000,5],[299_000,5]]){
    const cost=constructionSkipPrice(item,start+elapsed);
    assert.deepEqual({points:cost.points,coffee:cost.coffee,treats:cost.treats},{points:0,coffee:expected,treats:0});
  }
  const copy=sanitizeCity(JSON.parse(JSON.stringify(original)),CATALOG);
  assert.equal(constructionSkipPrice(copy.objects.at(-1),start+60_000).coffee,45);
});

test('parks and decorative construction cost 50, dropping to 25 then 5 coffee',()=>{
  const start=1800000000000;
  for(const kind of ['garden','playground','fountain','monument','extra-fountain']){
    const item={kind,buildStartedAt:start,buildReadyAt:start+120000};
    assert.equal(constructionSkipPrice(item,start).coffee,50,kind);
    assert.equal(constructionSkipPrice(item,start+59_999).coffee,50,kind);
    assert.equal(constructionSkipPrice(item,start+60000).coffee,25,kind);
    assert.equal(constructionSkipPrice(item,start+119_999).coffee,25,kind);
  }
  assert.equal(constructionSkipPrice({kind:'terrain_cliff_garden',buildStartedAt:start,buildReadyAt:start+90000},start).coffee,50);
});

test('skip charges ONLY coffee once and immediately completes the saved building',()=>{
  const start=1800000000000;
  const original=addObject(seed(),CATALOG,'villa',16,17,0,start);
  const uid=original.objects.at(-1).uid;
  const when=start+60_000;
  const result=skipConstruction(original,uid,when);
  assert.equal(result.spent.coffee,45);
  assert.equal(result.city.wallet.coffee,original.wallet.coffee-45);
  assert.equal(result.city.wallet.points,original.wallet.points);
  assert.equal(result.city.wallet.treats,original.wallet.treats);
  assert.equal(isConstructing(result.city.objects.at(-1),when),false);
  fail(()=>skipConstruction(result.city,uid,when),'NOT_CONSTRUCTING');
  assert.ok(isConstructing(original.objects.at(-1),when));
});

test('insufficient test coffee never completes construction or changes city',()=>{
  const start=1800000000000;
  let c=addObject(seed(),CATALOG,'villa',16,17,0,start);
  c.wallet.coffee=0;
  const snap=JSON.stringify(c);
  fail(()=>skipConstruction(c,c.objects.at(-1).uid,start),'INSUFFICIENT_BALANCE');
  assert.equal(JSON.stringify(c),snap);
});

test('save rejects parcels disconnected from owned land and invalid negative roads',()=>{
  const c=seed(),bad=cloneCity(c);
  bad.parcels=['100,0'];
  fail(()=>sanitizeCity(bad,CATALOG),'INVALID_SAVE');
  const another=cloneCity(c);another.roads.push('-4,12');
  fail(()=>sanitizeCity(another,CATALOG),'INVALID_SAVE');
});
