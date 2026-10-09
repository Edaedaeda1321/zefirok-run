// World Zeffi: isolated local test economy. No Worker/D1 or real balance writes.
import { ROAD_TILE_PRICE, PARCEL_PRICE } from './economy.js';
export const CITY_SIZE = 24;
export const STATE_VERSION = 2;
export const PARCEL_SIZE = 4;
export const INITIAL_WALLET = Object.freeze({points: 18000, coffee: 400, treats: 300});
export const TOPUP_AMOUNT = Object.freeze({points: 10000, coffee: 200, treats: 150});
export { PARCEL_PRICE }; // existing API maintained; configured in economy.js
// Only this isolated sandbox charges the demo wallet; production must use Worker.
export const SKIP_DISCOUNT_INTERVAL_MS = 60_000;
export const SKIP_DISCOUNT_COFFEE = 25;
export const MIN_SKIP_COFFEE = 5;
const BUILDING_SKIP_KINDS = new Set(['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery','flower-shop']);
const CURRENCIES = Object.freeze(['points', 'coffee', 'treats']);
const ZERO_PRICE = Object.freeze({ points: 0, coffee: 0, treats: 0 });
function validatePrice(price) {
  if(!price || !CURRENCIES.every(key => Number.isSafeInteger(price[key]) && price[key] >= 0))
    throw new BuildError('INVALID_PRICE');
  return price;
}
export function canAfford(wallet, price) {
  validatePrice(price);
  return Boolean(wallet && CURRENCIES.every(key => Number.isSafeInteger(wallet[key]) && wallet[key] >= price[key]));
}
function chargeWallet(city, price) {
  if(!canAfford(city.wallet, price)) throw new BuildError('INSUFFICIENT_BALANCE');
  for(const key of CURRENCIES) city.wallet[key] -= price[key];
}
export function objectPrice(catalog, kind) {
  const def = catalog[kind];
  if (!def) throw new BuildError('UNKNOWN_BUILDING');
  if (def.retired) throw new BuildError('NOT_AVAILABLE');
  const price = validatePrice(def.price);
  if(!CURRENCIES.some(key => price[key] > 0)) throw new BuildError('INVALID_PRICE');
  return price;
}
export function roadStrokePrice(city, positions, { erasing = false } = {}) {
  if(erasing) return {...ZERO_PRICE};
  // An already owned Road tile is never charged again, including duplicate drag points.
  const newTiles = new Set(positions.map(pos => keyOf(pos.x, pos.y)));
  for(const old of city.roads) newTiles.delete(old);
  const total = ROAD_TILE_PRICE.points * newTiles.size;
  if(!Number.isSafeInteger(total)) throw new BuildError('INVALID_PRICE');
  return {points: total, coffee: 0, treats: 0};
}

// Version 0.1.2 reads both v0.1 and v0.1.1 local saves without resetting layouts.
export const MAX_BUILD_MS = 24 * 60 * 60 * 1000;
export function isConstructing(item, now = Date.now()) {
  return Boolean(item && !item.stored && Number(item.buildReadyAt || 0) > now);
}
export function constructionRemaining(item, now = Date.now()) {
  return Math.max(0, Number(item?.buildReadyAt || 0) - now);
}
export function constructionSkipPrice(item, now = Date.now()) {
  const remaining = constructionRemaining(item, now);
  // Base quote: buildings 70 coffee; parks and construction decor 50 coffee.
  // Each FULL elapsed minute discounts another 25 coffee, but active jobs
  // never cost less than 5. Timestamps are persisted, so reloads do not reset.
  const started = Number(item?.buildStartedAt || 0);
  const elapsed = Math.max(0, Number(now) - started);
  const elapsedMinutes = started > 0 && Number.isFinite(elapsed)
    ? Math.floor(elapsed / SKIP_DISCOUNT_INTERVAL_MS) : 0;
  const baseCoffee = BUILDING_SKIP_KINDS.has(item?.kind) ? 70 : 50;
  const coffee = Math.max(MIN_SKIP_COFFEE, baseCoffee - elapsedMinutes * SKIP_DISCOUNT_COFFEE);
  return { free: false, points: 0, coffee, treats: 0, remaining, baseCoffee, elapsedMinutes };
}
export function skipConstruction(city, uid, now = Date.now()) {
  const item = city.objects.find(row => row.uid === uid);
  if (!item || item.stored) throw new BuildError('NOT_OWNED');
  if (!Number.isSafeInteger(now) || now < 0) throw new BuildError('INVALID_TIME');
  if (!isConstructing(item, now)) throw new BuildError('NOT_CONSTRUCTING');
  const cost = constructionSkipPrice(item, now);
  const next = cloneCity(city);
  chargeWallet(next, {points:cost.points,coffee:cost.coffee,treats:cost.treats});
  const target = next.objects.find(row => row.uid === uid);
  target.buildStartedAt = 0;
  target.buildReadyAt = 0;
  return { city: next, spent: cost };
}
export function topUpTestWallet(city) {
  const next = cloneCity(city);
  for(const key of ['points','coffee','treats']){
    if(next.wallet[key] > Number.MAX_SAFE_INTEGER - TOPUP_AMOUNT[key])throw new BuildError('WALLET_LIMIT');
    next.wallet[key] += TOPUP_AMOUNT[key];
  }
  return next;
}
export function finishConstruction(city, uid, now = Date.now()) {
  const item = city.objects.find(row => row.uid === uid);
  if (!item) throw new BuildError('NOT_OWNED');
  if (!Number.isFinite(now) || now < Number(item.buildReadyAt || 0)) throw new BuildError('NOT_FINISHED');
  // No write needed: elapsed wall-clock time itself makes the object complete.
  return city;
}

export const ROAD_START = Object.freeze({ x: 7, y: 13 });
export const keyOf = (x, y) => `${x},${y}`;
export const parcelKey = (cx, cy) => keyOf(cx, cy);
export const chunkAt = (x,y) => ({cx:Math.floor(x/PARCEL_SIZE),cy:Math.floor(y/PARCEL_SIZE)});
const parcelCache=new WeakMap();
function ownedExtensions(city){
  let cached=parcelCache.get(city);
  if(!cached||cached.size!==(city.parcels?.length||0)){
    cached=new Set(city.parcels||[]);
    parcelCache.set(city,cached);
  }
  return cached;
}
export const inBounds = (city, x, y) => {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return false;
  if (x >= 0 && y >= 0 && x < CITY_SIZE && y < CITY_SIZE) return true;
  const {cx,cy} = chunkAt(x,y);
  return ownedExtensions(city).has(parcelKey(cx,cy));
};
export const isInteger = value => Number.isInteger(value);

export function ownedParcels(city) {
  const set = new Set(ownedExtensions(city));
  for(let x=0;x<CITY_SIZE/PARCEL_SIZE;x++)for(let y=0;y<CITY_SIZE/PARCEL_SIZE;y++)set.add(parcelKey(x,y));
  return set;
}
export function expansionCandidates(city) {
  const owned = ownedParcels(city);
  const candidates = new Set();
  for(const key of owned){
    const [x,y] = key.split(',').map(Number);
    for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
      const nx=x+dx,ny=y+dy,id=parcelKey(nx,ny);
      if(Number.isSafeInteger(nx*PARCEL_SIZE)&&Number.isSafeInteger(ny*PARCEL_SIZE)&&!owned.has(id))candidates.add(id);
    }
  }
  return [...candidates].map(k=>{const [cx,cy]=k.split(',').map(Number);return {cx,cy,key:k};});
}
export function canBuyParcel(city,cx,cy) {
  if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cy))return false;
  return expansionCandidates(city).some(p=>p.cx===cx&&p.cy===cy);
}
export function expansionPrice(city = null) {
  // The starter 24x24 region is free; only purchased 4x4 parcels raise the price.
  // First purchase: 1x, second: 2x, third: 4x, fourth: 8x, ...
  const count = Array.isArray(city?.parcels) ? city.parcels.length : 0;
  const multiplier = 2 ** count;
  const points = PARCEL_PRICE.points * multiplier;
  const coffee = PARCEL_PRICE.coffee * multiplier;
  const treats = PARCEL_PRICE.treats * multiplier;
  // JS cannot safely represent arbitrarily large currency amounts. Stop
  // purchases past that boundary instead of displaying Infinity or charging wrongly.
  if (![points, coffee, treats].every(Number.isSafeInteger)) {
    return {points: Number.MAX_SAFE_INTEGER, coffee: 0, treats: Number.MAX_SAFE_INTEGER, unavailable: true};
  }
  return {points, coffee, treats};
}
export function buyParcel(city,cx,cy) {
  if(!canBuyParcel(city,cx,cy))throw new BuildError('INVALID_PARCEL');
  const price=expansionPrice(city);
  if (price.unavailable) throw new BuildError('PRICE_LIMIT');
  const next=cloneCity(city);
  chargeWallet(next,price);
  next.parcels.push(parcelKey(cx,cy));
  return next;
}

export class BuildError extends Error {
  constructor(code, message = code) { super(message); this.name = 'BuildError'; this.code = code; }
}

export function dims(def, rotation = 0) {
  const even = (((rotation % 4) + 4) % 4) % 2 === 0;
  return { w: even ? def.w : def.h, h: even ? def.h : def.w };
}
export function rotateLocalPoint(u, v, w, h, rotation = 0) {
  switch(((rotation % 4) + 4) % 4) {
    case 1: return {x: h-v, y:u};
    case 2: return {x:w-u,y:h-v};
    case 3: return {x:v,y:w-u};
    default:return {x:u,y:v};
  }
}

export function cellsFor(x, y, w, h) {
  const cells = [];
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) cells.push(keyOf(x + dx, y + dy));
  return cells;
}

export function footprint(item, catalog) {
  const def = catalog[item.kind];
  if (!def) throw new BuildError('UNKNOWN_BUILDING');
  const { w, h } = dims(def, item.rotation || 0);
  return { ...item, w, h, cells: cellsFor(item.x, item.y, w, h) };
}

export function findOccupant(city, catalog, x, y, excludeUid = '') {
  // Give solid buildings priority when their cells also have a paving layer.
  const ordered=[...city.objects.filter(o=>catalog[o.kind]?.layer!=='surface'),
                 ...city.objects.filter(o=>catalog[o.kind]?.layer==='surface')];
  for (const item of ordered) {
    if (item.stored || item.uid === excludeUid) continue;
    const { w, h } = dims(catalog[item.kind], item.rotation || 0);
    if (x >= item.x && x < item.x + w && y >= item.y && y < item.y + h) return item;
  }
  return null;
}

export function checkPlacement(city, catalog, kind, x, y, rotation = 0, excludeUid = '') {
  const def = catalog[kind];
  if (!def) return { ok: false, code: 'UNKNOWN_BUILDING' };
  if (![x, y, rotation].every(isInteger)) return { ok: false, code: 'INVALID_POSITION' };
  const { w, h } = dims(def, rotation);
  for(let cx=x;cx<x+w;cx++)for(let cy=y;cy<y+h;cy++){
    if(!inBounds(city,cx,cy))return {ok:false,code:'OUTSIDE_CITY'};
  }
  for (let cx = x; cx < x + w; cx++) for (let cy = y; cy < y + h; cy++) {
    if (def.layer !== 'surface' && city.roads.includes(keyOf(cx, cy))) return { ok: false, code: 'ROAD_COLLISION' };
    // Paving and constructions can overlap; two surfaces or two solid
    // objects still cannot. This permits a monument on a 3x3 plaza.
    // Parks must also stay exclusive and never stack on each other.
    for(const other of city.objects){
      if(other.stored || other.uid===excludeUid)continue;
      const otherDef=catalog[other.kind];
      const sameLayer=(otherDef?.layer==='surface') === (def.layer==='surface');
      const bothParks=otherDef?.category==='parks' && def.category==='parks';
      if(!sameLayer && !bothParks)continue;
      const size=dims(otherDef,other.rotation||0);
      if(cx>=other.x&&cx<other.x+size.w&&cy>=other.y&&cy<other.y+size.h)
        return {ok:false,code:'BUILDING_COLLISION'};
    }
  }
  return { ok: true, code: 'OK', w, h };
}

function checkedPlacement(city, catalog, kind, x, y, rotation, excludeUid = '') {
  const result = checkPlacement(city, catalog, kind, x, y, rotation, excludeUid);
  if (!result.ok) throw new BuildError(result.code);
  return result;
}

export function makeInitialCity() {
  const roads = [];
  for (let x = 7; x <= 15; x++) roads.push(keyOf(x, 13));
  return {
    version: STATE_VERSION,
    size: CITY_SIZE,
    parcels: [],
    wallet: {...INITIAL_WALLET},
    nextId: 5,
    roads,
    lockedRoads: [keyOf(7, 13), keyOf(8, 13)],
    objects: [
      { uid: 'obj-1', kind: 'cottage', x: 9, y: 11, rotation: 0, level: 1, stored: false, buildStartedAt: 0, buildReadyAt: 0 },
      { uid: 'obj-2', kind: 'tree', x: 13, y: 11, rotation: 0, level: 1, stored: false , buildStartedAt: 0, buildReadyAt: 0 },
      { uid: 'obj-3', kind: 'flowerbed', x: 12, y: 10, rotation: 0, level: 1, stored: false , buildStartedAt: 0, buildReadyAt: 0 },
      { uid: 'obj-4', kind: 'lamp', x: 14, y: 12, rotation: 0, level: 1, stored: false , buildStartedAt: 0, buildReadyAt: 0 }
    ]
  };
}

export function cloneCity(city) {
  return {
    ...city,
    parcels: [...(city.parcels || [])],
    wallet: {...city.wallet},
    roads: [...city.roads],
    lockedRoads: [...city.lockedRoads],
    objects: city.objects.map(item => ({ ...item }))
  };
}

export function addObject(city, catalog, kind, x, y, rotation = 0, now = Date.now()) {
  const price = objectPrice(catalog, kind);
  checkedPlacement(city, catalog, kind, x, y, rotation);
  const delay = Math.max(0, Math.min(MAX_BUILD_MS, Math.floor(Number(catalog[kind]?.buildMs) || 0)));
  if (!Number.isSafeInteger(now) || now < 0 || now + delay > Number.MAX_SAFE_INTEGER) throw new BuildError('INVALID_TIME');
  const next = cloneCity(city);
  chargeWallet(next, price);
  next.objects.push({ uid: `obj-${next.nextId++}`, kind, x, y, rotation, level: 1, stored: false, buildStartedAt: delay ? now : 0, buildReadyAt: delay ? now + delay : 0 });
  return next;
}

function findOwned(city, uid) {
  const item = city.objects.find(row => row.uid === uid);
  if (!item) throw new BuildError('NOT_OWNED');
  return item;
}

export function moveObject(city, catalog, uid, x, y, rotation = 0) {
  const item = findOwned(city, uid);
  if (item.stored) throw new BuildError('ITEM_IS_STORED');
  checkedPlacement(city, catalog, item.kind, x, y, rotation, uid);
  const next = cloneCity(city);
  Object.assign(findOwned(next, uid), { x, y, rotation });
  return next;
}

export function storeObject(city, uid) {
  const item = findOwned(city, uid);
  if (item.stored) throw new BuildError('ITEM_IS_STORED');
  const next = cloneCity(city);
  Object.assign(findOwned(next, uid), { stored: true, x: null, y: null });
  return next;
}

export function restoreObject(city, catalog, uid, x, y, rotation = 0) {
  const item = findOwned(city, uid);
  if (!item.stored) throw new BuildError('ITEM_ALREADY_PLACED');
  checkedPlacement(city, catalog, item.kind, x, y, rotation);
  const next = cloneCity(city);
  Object.assign(findOwned(next, uid), { stored: false, x, y, rotation });
  return next;
}

export function nextRotation(rotation) { return (rotation + 1) % 4; }

// The pointer follows a four-connected route, even when it skips tile centers.
export function orthogonalPath(from, to, preferred = 'x') {
  if (!from || !to || ![from.x, from.y, to.x, to.y].every(isInteger)) return [];
  const result = [{ x: from.x, y: from.y }];
  let x = from.x, y = from.y;
  const axisOrder = preferred === 'y' ? ['y', 'x'] : ['x', 'y'];
  for (const axis of axisOrder) {
    if (axis === 'x') while (x !== to.x) { x += Math.sign(to.x - x); result.push({ x, y }); }
    else while (y !== to.y) { y += Math.sign(to.y - y); result.push({ x, y }); }
  }
  return result;
}

export function checkRoadStroke(city, catalog, positions, { erasing = false } = {}) {
  if (!Array.isArray(positions) || positions.length < 1 || positions.length > 256) return { ok: false, code: 'ROAD_STROKE_LIMIT' };
  const known = new Set();
  let previous = null;
  for (const pos of positions) {
    if (!pos || !Number.isInteger(pos.x) || !Number.isInteger(pos.y) || !inBounds(city, pos.x, pos.y)) return { ok: false, code: 'OUTSIDE_CITY' };
    if (previous && Math.abs(pos.x - previous.x) + Math.abs(pos.y - previous.y) > 1) return { ok: false, code: 'ROAD_DISCONNECTED' };
    previous = pos;
    const id = keyOf(pos.x, pos.y);
    if (known.has(id)) continue;
    known.add(id);
    if (erasing) {
      if (city.lockedRoads.includes(id)) return { ok: false, code: 'LOCKED_ROAD' };
    } else {
      // Paving is drawn beneath traffic: it must never sever a road.
      const occupant=findOccupant(city,catalog,pos.x,pos.y);
      if(occupant && catalog[occupant.kind]?.layer!=='surface')return {ok:false,code:'BUILDING_COLLISION'};
    }
  }
  return { ok: true, code: 'OK' };
}

export function applyRoadStroke(city, catalog, positions, { erasing = false } = {}) {
  const checked = checkRoadStroke(city, catalog, positions, { erasing });
  if (!checked.ok) throw new BuildError(checked.code);
  const price = roadStrokePrice(city, positions, { erasing });
  const next = cloneCity(city);
  chargeWallet(next, price);
  const ids = new Set(positions.map(p => keyOf(p.x, p.y)));
  if (erasing) next.roads = next.roads.filter(id => !ids.has(id));
  else next.roads = [...new Set([...next.roads, ...ids])];
  return next;
}

export function connectedRoads(city) {
  const roadSet = new Set(city.roads);
  const origin = keyOf(ROAD_START.x, ROAD_START.y);
  if (!roadSet.has(origin)) return new Set();
  const visited = new Set([origin]);
  const q = [ROAD_START];
  for (let i = 0; i < q.length; i++) {
    const point = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = point.x + dx, y = point.y + dy;
      const id = keyOf(x, y);
      if (roadSet.has(id) && !visited.has(id)) {
        visited.add(id); q.push({ x, y });
      }
    }
  }
  return visited;
}

export function isObjectConnected(item, city, catalog, connected = connectedRoads(city), now = Date.now()) {
  const def = catalog[item.kind];
  if (!def || item.stored || isConstructing(item, now)) return false;
  if (!def.needsRoad) return true;
  const { w, h } = dims(def, item.rotation);
  for (let x = item.x; x < item.x + w; x++) {
    if (connected.has(keyOf(x, item.y - 1)) || connected.has(keyOf(x, item.y + h))) return true;
  }
  for (let y = item.y; y < item.y + h; y++) {
    if (connected.has(keyOf(item.x - 1, y)) || connected.has(keyOf(item.x + w, y))) return true;
  }
  return false;
}

export function cityStats(city, catalog, now = Date.now()) {
  const connected = connectedRoads(city);
  const placed = city.objects.filter(item => !item.stored);
  return {
    buildings: placed.length,
    // Only real residences and shops; the separate buildings field stays
    // backward-compatible for older saves, diagnostics and tests.
    structures: placed.filter(item => ['homes','shops'].includes(catalog[item.kind]?.category)).length,
    constructing: placed.filter(item => isConstructing(item, now)).length,
    ready: placed.filter(item => !isConstructing(item, now)).length,
    roads: city.roads.length,
    stored: city.objects.length - placed.length,
    connected: placed.filter(item => catalog[item.kind]?.needsRoad && isObjectConnected(item, city, catalog, connected, now)).length,
    disconnected: placed.filter(item => catalog[item.kind]?.needsRoad && !isObjectConnected(item, city, catalog, connected, now) && !isConstructing(item, now)).length
  };
}

export function sanitizeCity(input, catalog) {
  if (!input || ![1, STATE_VERSION].includes(input.version) || input.size !== CITY_SIZE) throw new BuildError('UNSUPPORTED_SAVE');
  if (!Array.isArray(input.roads) || !Array.isArray(input.objects) || !Array.isArray(input.lockedRoads) || input.objects.length > 50000) throw new BuildError('INVALID_SAVE');
  const v2 = input.version === STATE_VERSION;
  if(v2 && (!Array.isArray(input.parcels) || !input.wallet || typeof input.wallet !== 'object')) throw new BuildError('INVALID_SAVE');
  const city = { version: STATE_VERSION, size: CITY_SIZE, nextId: Number(input.nextId), parcels: [], wallet: {...INITIAL_WALLET}, roads: [], lockedRoads: [], objects: [] };
  if (!Number.isSafeInteger(city.nextId) || city.nextId < 1) throw new BuildError('INVALID_SAVE');
  if(v2){
    for(const key of ['points','coffee','treats']){
      if(!Number.isSafeInteger(input.wallet[key])||input.wallet[key]<0)throw new BuildError('INVALID_SAVE');
      city.wallet[key]=input.wallet[key];
    }
    if(input.parcels.length>100000)throw new BuildError('INVALID_SAVE');
    const unique = new Set();
    for(const key of input.parcels){
      if(typeof key!=='string'|| !/^-?\d{1,9},-?\d{1,9}$/.test(key) || unique.has(key))throw new BuildError('INVALID_SAVE');
      const [cx,cy]=key.split(',').map(Number);
      if(cx>=0&&cy>=0&&cx<CITY_SIZE/PARCEL_SIZE&&cy<CITY_SIZE/PARCEL_SIZE)throw new BuildError('INVALID_SAVE');
      unique.add(key);
    }
    // Validate that every paid plot is connected to the original city, regardless of save order.
    const visited=new Set();const queue=[];
    for(let x=0;x<CITY_SIZE/PARCEL_SIZE;x++)for(let y=0;y<CITY_SIZE/PARCEL_SIZE;y++)queue.push([x,y]);
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i];
      for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const cx=x+dx,cy=y+dy,id=parcelKey(cx,cy);
        if(unique.has(id)&&!visited.has(id)){
          visited.add(id);queue.push([cx,cy]);
        }
      }
    }
    if(visited.size!==unique.size)throw new BuildError('INVALID_SAVE');
    city.parcels=[...input.parcels];
  }
  if(input.roads.length>CITY_SIZE*CITY_SIZE+city.parcels.length*PARCEL_SIZE*PARCEL_SIZE)throw new BuildError('INVALID_SAVE');
  const roadSeen=new Set();
  for (const s of input.roads) {
    if (typeof s !== 'string' || !/^-?\d{1,9},-?\d{1,9}$/.test(s)) throw new BuildError('INVALID_SAVE');
    const [x, y] = s.split(',').map(Number);
    if (!inBounds(city, x, y) || roadSeen.has(s)) throw new BuildError('INVALID_SAVE');
    roadSeen.add(s);
    city.roads.push(s);
  }
  for (const key of [keyOf(7,13),keyOf(8,13)]) if (!city.roads.includes(key)) throw new BuildError('INVALID_SAVE');
  city.lockedRoads = [keyOf(7, 13), keyOf(8, 13)];
  const seen = new Set();
  for (const raw of input.objects) {
    if (!raw || typeof raw.uid !== 'string' || !/^obj-\d+$/.test(raw.uid) || seen.has(raw.uid) || !catalog[raw.kind] || !isInteger(raw.rotation) || raw.rotation < 0 || raw.rotation > 3 || !isInteger(raw.level) || raw.level < 1 || raw.level > 3 || typeof raw.stored !== 'boolean') throw new BuildError('INVALID_SAVE');
    seen.add(raw.uid);
    if (Number(raw.uid.slice(4)) >= city.nextId) throw new BuildError('INVALID_SAVE');
    // Legacy v0.1 saves did not include construction metadata; those existing buildings are ready.
    const started = raw.buildStartedAt == null ? 0 : raw.buildStartedAt;
    const ready = raw.buildReadyAt == null ? 0 : raw.buildReadyAt;
    if (!Number.isSafeInteger(started) || !Number.isSafeInteger(ready) || started < 0 || ready < 0 ||
        (ready === 0 && started !== 0) || (ready !== 0 && (started <= 0 || ready <= started || ready - started > MAX_BUILD_MS))) throw new BuildError('INVALID_SAVE');
    const item = { uid: raw.uid, kind: raw.kind, x: raw.stored ? null : Number(raw.x), y: raw.stored ? null : Number(raw.y), rotation: raw.rotation, level: raw.level, stored: raw.stored, buildStartedAt: started, buildReadyAt: ready };
    if (!item.stored) {
      const checked = checkPlacement(city, catalog, item.kind, item.x, item.y, item.rotation);
      if (!checked.ok) throw new BuildError('INVALID_SAVE');
    }
    city.objects.push(item);
  }
  return city;
}
