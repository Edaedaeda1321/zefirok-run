// Mir Zeffi P1: versioned, validated economy specification used identically by
// the authoritative Worker and the hosted client. This module never writes D1.
import {CATALOG as BASE_CATALOG,CATALOG_ITEMS as BASE_ITEMS} from './catalog.js';
import {CITY_LEVELS,makeInitialCity,cityStats,addObject,checkPlacement,keyOf} from './engine.js';

export const WORLD_BALANCE_SCHEMA=1;
const FIELDS=['points','treats','coffee'];
const number=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function defaultWorldBalance(){
 return {schema:WORLD_BALANCE_SCHEMA,
  levels:CITY_LEVELS.map(x=>({level:x.level,residents:x.residents,comfort:x.comfort,parks:x.parks,shops:x.shops,
   reward:x.reward?{...x.reward}:null})),
  items:Object.fromEntries(BASE_ITEMS.map(x=>[x.id,{minCityLevel:x.minCityLevel,price:{...x.price}}]))};
}
function error(message){throw new Error('WORLD_BALANCE_INVALID: '+message);}
// Full canonicalization rejects unknown/missing objects, partial rewards,
// misplaced catalogue ids, unsafe numbers and non-monotonic conditions.
export function validateWorldBalance(input,{reachability=true}={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==WORLD_BALANCE_SCHEMA)error('Неподдерживаемая версия конфигурации.');
 if(Object.keys(input).sort().join(',')!=='items,levels,schema')error('Недопустимые поля верхнего уровня.');
 if(!Array.isArray(input.levels)||input.levels.length!==CITY_LEVELS.length||CITY_LEVELS.length!==10)error('Нужно ровно 10 уровней.');
 const levels=input.levels.map((raw,i)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='comfort,level,parks,residents,reward,shops')error('Неверные поля уровня '+(i+1));
  if(raw.level!==i+1)error('Неверный порядок уровней.');
  const caps={residents:150,comfort:1100,parks:15,shops:15};
  for(const [key,max] of Object.entries(caps))if(!number(raw[key],max))error(`Уровень ${i+1}: недопустимое поле ${key}.`);
  if(i===0){
   if(raw.reward!==null||['residents','comfort','parks','shops'].some(k=>raw[k]!==0))error('Уровень 1 должен быть начальным, без награды.');
  }else{
   const prev=input.levels[i-1];
   if(raw.residents<=prev.residents||raw.comfort<=prev.comfort||raw.parks<prev.parks||raw.shops<prev.shops)
    error(`Уровень ${i+1}: показатели должны последовательно возрастать.`);
   const r=raw.reward;
   if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='coffee,points,treats')error(`Уровень ${i+1}: отсутствует полный набор наград.`);
   for(const [key,max] of [['points',100_000],['treats',500],['coffee',200]])if(!number(r[key],max))error(`Уровень ${i+1}: некорректная награда ${key}.`);
   if(FIELDS.every(k=>r[k]===0))error(`Уровень ${i+1}: награда должна быть положительной.`);
  }
  return {level:i+1,titleKey:CITY_LEVELS[i].titleKey,residents:raw.residents,comfort:raw.comfort,parks:raw.parks,shops:raw.shops,reward:raw.reward?{...raw.reward}:null};
 });
 const ids=BASE_ITEMS.map(x=>x.id).sort();
 if(!input.items||typeof input.items!=='object'||Array.isArray(input.items))error('Каталог должен включать все существующие объекты и только их.');
 // 2026-10 park release: old saved P1 draft/published JSON lacks exactly one
 // new purchaseable kind. Canonicalize it with the safe default price/unlock
 // without mutating D1 or accepting other missing/unknown catalog entries.
 const newPark='central-park-zeffi';
 const keys=Object.keys(input.items).sort();
 const legacyIds=ids.filter(id=>id!==newPark);
 const legacy=ids.includes(newPark)&&!Object.hasOwn(input.items,newPark)&&keys.join(',')===legacyIds.join(',');
 const canonicalInput=legacy?{...input.items,[newPark]:{minCityLevel:BASE_CATALOG[newPark].minCityLevel,price:{...BASE_CATALOG[newPark].price}}}:input.items;
 if(Object.keys(canonicalInput).sort().join(',')!==ids.join(','))error('Каталог должен включать все существующие объекты и только их.');
 const items={};const distribution=Array(11).fill(0);
 for(const id of ids){
  const raw=canonicalInput[id];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='minCityLevel,price')error('Неверные поля объекта '+id);
  if(!Number.isInteger(raw.minCityLevel)||raw.minCityLevel<1||raw.minCityLevel>10)error('Недопустимый уровень открытия: '+id);
  if(!raw.price||typeof raw.price!=='object'||Object.keys(raw.price).sort().join(',')!=='coffee,points,treats')error('Неверная цена: '+id);
  if(!number(raw.price.points,2_000_000)||raw.price.points<1||!number(raw.price.treats,10_000)||raw.price.coffee!==0)
    error('Цена '+id+': нужны очки, допустимый зефир и 0 обязательного кофе.');
  items[id]={minCityLevel:raw.minCityLevel,price:{points:raw.price.points,treats:raw.price.treats,coffee:0}};
  distribution[raw.minCityLevel]++;
 }
 for(let i=1;i<=10;i++)if(!distribution[i])error(`На уровне ${i} не открывается ни один объект.`);
 for(const id of ['cottage','coffee-kiosk','playground'])if(items[id]?.minCityLevel!==1)error(`Базовая постройка ${id} должна оставаться доступна с 1-го уровня.`);
 const canonical={schema:1,levels:levels.map(x=>({level:x.level,residents:x.residents,comfort:x.comfort,parks:x.parks,shops:x.shops,reward:x.reward})),items};
 if(reachability)assertWorldBalanceReachable(canonical);
 return canonical;
}

export function createWorldBalanceRuntime(spec){
 const levels=spec.levels.map((x,i)=>Object.freeze({titleKey:CITY_LEVELS[i].titleKey,...x,reward:x.reward?Object.freeze({...x.reward}):null}));
 const catalog=Object.fromEntries(Object.entries(BASE_CATALOG).map(([id,def])=>{
  const override=spec.items[id];
  return [id,override?Object.freeze({...def,minCityLevel:override.minCityLevel,price:Object.freeze({...override.price})}):def];
 }));
 Object.defineProperty(catalog,'__cityLevels',{value:Object.freeze(levels),enumerable:false,writable:false});
 return {catalog:Object.freeze(catalog),levels:Object.freeze(levels),catalogItems:Object.freeze(BASE_ITEMS.map(def=>catalog[def.id]))};
}

// Real 24x24 construction planner, based on RC6's end-to-end level-10 test.
// Runs only on owner draft validation / publish, never on player mutation.
export function assertWorldBalanceReachable(spec){
 const {catalog}=createWorldBalanceRuntime(spec);
 let now=1_800_000_000_000;
 let city=makeInitialCity();city.wallet={points:2_000_000_000,treats:1_000_000,coffee:1_000_000};
 const roads=new Set(city.roads);
 for(let x=0;x<24;x++)for(const y of [1,6,13,20])roads.add(keyOf(x,y));
 for(let y=0;y<24;y++)roads.add(keyOf(2,y));
 city.roads=[...roads];
 const priority=(items,type)=>items.filter(x=>type(x)&&x.minCityLevel<=cityStats(city,catalog,now).cityLevel).sort((a,b)=>a.w*a.h-b.w*b.h);
 for(let target=2;target<=10;target++){
  const need=spec.levels[target-1];
  let step=0;
  while(cityStats(city,catalog,now).cityLevel<target){
   if(++step>110)error('Недостижимо: слишком много построек до уровня '+target);
   const current=cityStats(city,catalog,now);
   const available=Object.values(catalog).filter(x=>x&&x.price&&!x.retired&&x.minCityLevel<=current.cityLevel);
   let requested=[];
   if(current.parks<need.parks)requested=priority(available,x=>x.category==='parks');
   else if(current.shops<need.shops)requested=priority(available,x=>x.category==='shops');
   else if(current.population<need.residents)requested=priority(available,x=>x.category==='homes');
   else if(current.comfort<need.comfort)requested=priority(available,x=>x.category==='parks');
   else error('Уровень '+target+' не повышается при выполненных условиях.');
   if(!requested.length)error(`Недостижимо: нет объектов нужной категории для уровня ${target}.`);
   let done=false;
   for(const def of requested){
    let best=null;
    for(let y=0;y<=24-def.h;y++)for(let x=0;x<=24-def.w;x++){
     if(!checkPlacement(city,catalog,def.id,x,y).ok)continue;
     let touching=false;
     for(let xx=x;xx<x+def.w;xx++)if(roads.has(keyOf(xx,y-1))||roads.has(keyOf(xx,y+def.h)))touching=true;
     for(let yy=y;yy<y+def.h;yy++)if(roads.has(keyOf(x-1,yy))||roads.has(keyOf(x+def.w,yy)))touching=true;
     if(def.needsRoad&&!touching)continue;
     const weight=(def.needsRoad?0:touching?100:0)+(y<7?12:0)+x*.01+y*.001;
     if(!best||weight<best.weight)best={x,y,weight};
    }
    if(!best)continue;
    try{city=addObject(city,catalog,def.id,best.x,best.y,0,now);now+=1_000_000;done=true;break;}
    catch{continue;}
   }
   if(!done)error(`Недостижимо: недостаточно свободных клеток или дорожных подключений до уровня ${target}.`);
  }
 }
 return {valid:true,level:cityStats(city,catalog,now).cityLevel,objects:city.objects.length};
}
