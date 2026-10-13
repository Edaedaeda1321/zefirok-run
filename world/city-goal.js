// RC-2: read-only, deterministic recommendations from the authoritative city snapshot.
// This module never modifies a save, wallet, construction timer or D1 state.
import {buildingEffectPreview, canAfford, isConstructing, constructionRemaining,
  connectedRoads, isObjectConnected} from './engine.js';

const PRICE_FIELDS = ['points','coffee','treats'];
const CHEAP_REPEAT_DECOR = new Set(['tree','flowerbed','lamp','bench','extra-tree',
 'extra-flowerbed','extra-bush','extra-lamp','extra-bench','extra-planter']);

function shortfall(wallet={},price={}) {
 const missing={};
 for(const key of PRICE_FIELDS){
  const difference=Math.max(0,Number(price[key]||0)-Number(wallet[key]||0));
  if(difference)missing[key]=difference;
 }
 return missing;
}

function availableItems(catalogItems,level) {
 return catalogItems.filter(item=>!item.retired && Number(item.minCityLevel||1)<=level && item.price);
}

function relatedToGoal(def,goal){
 if(goal==='parks')return def.category==='parks';
 if(goal==='shops')return def.category==='shops';
 const benefit=buildingEffectPreview(def);
 if(goal==='population')return benefit.population>0 && (def.category==='homes'||def.category==='shops'||def.category==='parks'||def.category==='transport');
 if(goal==='comfort')return benefit.comfort>0 && !['landscape'].includes(def.category);
 return false;
}


function utility(def,goal,copyCount){
 const effect=buildingEffectPreview(def);
 if(goal==='parks'||goal==='shops')return 1;
 if(goal==='population')return effect.population;
 let comfort=effect.comfort;
 if(CHEAP_REPEAT_DECOR.has(def.id)){
  if(copyCount>8)comfort=1;
  else if(copyCount>4)comfort=Math.max(1,Math.ceil(comfort/2));
 }
 return comfort;
}

function itemRank(def,goal,existingCopies){
 // First prefer reasonable starter purchases; for comfort-only goals account
 // for the diminishing benefits of repeated small decoration.
 const cost=(Number(def.price.points||0)+Number(def.price.treats||0)*600+
  Number(def.price.coffee||0)*900);
 const effect=Math.max(1,utility(def,goal,(existingCopies.get(def.id)||0)+1));
 if(goal==='parks'||goal==='shops')return cost;
 // Discourage dozens of trivial 1x1 decorations as the main strategy for a
 // high-comfort level. A moderate per-building effort cost favours meaningful parks.
 const effort=goal==='comfort'?6000:1300;
 return (cost+effort)/(Math.min(effect,goal==='population'?5:24));
}

function firstRoadProblem(city,catalog,goal,now){
 if(!['population','shops','comfort'].includes(goal))return null;
 const roads=connectedRoads(city);
 return (city.objects||[]).find(item=>{
  if(item.stored||isConstructing(item,now))return false;
  const def=catalog[item.kind];
  if(!def?.needsRoad || isObjectConnected(item,city,catalog,roads,now))return false;
  return relatedToGoal(def,goal) || (goal==='comfort' && buildingEffectPreview(def).comfort>0);
 })||null;
}

/**
 * @returns {{type:string,goal?:string,itemId?:string,uid?:string,price?:object,missing?:object,
 *  title:string,detail:string,button:string,level?:number}}
 */
export function nextCityGoal({city,stats,catalog,catalogItems,now=Date.now(),purchasesEnabled=true}){
 if(!city||!stats||!catalog||!Array.isArray(catalogItems))throw new Error('CITY_GOAL_INPUT_INVALID');
 if(stats.claimableLevel){
  return {type:'claim',level:stats.claimableLevel,title:'Награда уже ждёт!',
   detail:`Ты достиг ${stats.claimableLevel}-го уровня. Забери заслуженный подарок.`,button:'Забрать подарок'};
 }
 const target=stats.nextCityLevel;
 if(!target){return {type:'done',title:'Город растёт вместе с тобой!',
  detail:'Все доступные уровни открыты. Украшай город и создавай новые уютные уголки.',button:''};}
 const requirements=[
  ['parks',Number(stats.parks||0),Number(target.parks||0),'Нужен ещё парк, чтобы город стал уютнее.'],
  ['shops',Number(stats.shops||0),Number(target.shops||0),'Нужно заведение, подключённое к дороге.'],
  ['population',Number(stats.population||0),Number(target.residents||0),'Городу не хватает жителей.'],
  ['comfort',Number(stats.comfort||0),Number(target.comfort||0),'Добавь уюта в свой город.']
 ];
 const copies=new Map();
 for(const item of city.objects||[])if(!item.stored)copies.set(item.kind,(copies.get(item.kind)||0)+1);
 for(const [goal,current,required,reason] of requirements){
  if(current>=required)continue;
  const roadProblem=firstRoadProblem(city,catalog,goal,now);
  if(roadProblem)return {type:'road',goal,uid:roadProblem.uid,level:target.level,
   title:'Подведи дорогу',detail:'Неподключённая постройка не даёт весь свой эффект. Соедини её с городской дорогой.',
   button:'Показать дороги'};
  const construction=(city.objects||[]).find(item=>!item.stored && isConstructing(item,now)
    && relatedToGoal(catalog[item.kind]||{},goal));
  if(construction)return {type:'wait',goal,uid:construction.uid,itemId:construction.kind,level:target.level,
   title:'Стройка уже идёт',detail:'После завершения этой постройки показатели города обновятся.',
   remaining:constructionRemaining(construction,now),button:'Найти на карте'};
  const unlocked=availableItems(catalogItems,stats.cityLevel)
    .filter(item=>relatedToGoal(item,goal))
    .sort((a,b)=>itemRank(a,goal,copies)-itemRank(b,goal,copies)||a.id.localeCompare(b.id));
  if(!unlocked.length)continue;
  const affordable=unlocked.find(item=>canAfford(city.wallet,item.price));
  const pick=affordable||unlocked[0];
  const missing=shortfall(city.wallet,pick.price);
  if(!purchasesEnabled){return {type:'paused',goal,level:target.level,itemId:pick.id,price:pick.price,
   title:'Строительство временно закрыто',detail:'Сервер пока не разрешает новые покупки. Прогресс города сохранён.',
   button:'Покупки закрыты'};}
  if(!affordable)return {type:'earn',goal,itemId:pick.id,level:target.level,price:pick.price,missing,
   title:'Подкопи на следующую постройку',detail:reason,button:'Вернуться к забегу'};
  return {type:'build',goal,itemId:pick.id,level:target.level,price:pick.price,
   title:'Следующий шаг',detail:reason,button:'Показать в каталоге'};
 }
 return {type:'review',level:target.level,title:'Проверь развитие города',
  detail:'Условия близки к выполнению. Открой статистику после завершения строительства.',button:''};
}

export function cityGoalMilestone(previous,latest){
 if(!previous||!latest)return '';
 if(latest.cityLevel>previous.cityLevel)return `Новый уровень города — ${latest.cityLevel}! ✨`;
 if(previous.parks===0 && latest.parks>0)return 'Ура! В городе появился первый парк!';
 if(previous.shops===0 && latest.shops>0)return 'У нас открылось первое заведение!';
 return '';
}
