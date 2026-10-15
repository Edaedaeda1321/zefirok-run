// Permanent, goal-oriented city chapters; never dependent on premium/random items.
// Pure snapshot evaluation. Claims and prizes are authorized only by the Worker.
import {cityStats, isConstructing} from './engine.js';
import {WORLD_REWARD_DECOR_BY_ID} from './decor-rewards.js';

export const CITY_CHAPTERS = Object.freeze([
  {id:'warm-welcome',title:'Уютный городок',description:'Создай дружелюбный квартал для первых жителей.',rewardDecor:'extra-bench',steps:[
    {id:'residents',title:'Посели 8 жителей',metric:'residents',target:8},
    {id:'park',title:'Открой парк',metric:'parks',target:1},
    {id:'roads',title:'Построй 8 клеток дорог',metric:'roads',target:8},
    {id:'comfort',title:'Достигни 60 уюта',metric:'comfort',target:60}
  ]},
  {id:'coffee-capital',title:'Кофейная столица',description:'Развивай кафе и цветущий общественный район.',rewardDecor:'extra-fountain',steps:[
    {id:'shops',title:'Открой 3 магазина и кафе',metric:'shops',target:3},
    {id:'residents',title:'Привлеки 40 жителей',metric:'residents',target:40},
    {id:'comfort',title:'Достигни 330 уюта',metric:'comfort',target:330},
    {id:'decor',title:'Установи 4 разных вида декора',metric:'decorKinds',target:4}
  ]},
  {id:'legendary-city',title:'Легендарный Мир Зеффи',description:'Построй процветающий город даже после десятого уровня.',rewardDecor:'monument',steps:[
    {id:'level',title:'Достигни 10 уровня города',metric:'cityLevel',target:10},
    {id:'parks',title:'Создай 5 парков',metric:'parks',target:5},
    {id:'shops',title:'Открой 4 магазина и кафе',metric:'shops',target:4},
    {id:'decor',title:'Укрась город 6 разными видами декора',metric:'decorKinds',target:6}
  ]},
  {id:'flower-neighborhood',title:'Цветущий район',description:'После 10 уровня преврати город в большой цветущий район.',rewardDecor:'extra-arch',steps:[
    {id:'parks',title:'Обустроить 7 парков',metric:'parks',target:7},
    {id:'comfort',title:'Создать 800 уюта',metric:'comfort',target:800},
    {id:'shops',title:'Открыть 5 кафе и магазинов',metric:'shops',target:5},
    {id:'decor',title:'Поставить 8 разных видов декора',metric:'decorKinds',target:8}
  ]},
  {id:'city-of-dreams',title:'Город мечты Зеффи',description:'Финальный престижный проект для увлечённых строителей.',rewardDecor:'extra-sweet_object',steps:[
    {id:'residents',title:'Привлечь 100 жителей',metric:'residents',target:100},
    {id:'comfort',title:'Достичь 1000 уюта',metric:'comfort',target:1000},
    {id:'parks',title:'Создать 9 парков',metric:'parks',target:9},
    {id:'shops',title:'Открыть 6 кафе и магазинов',metric:'shops',target:6},
    {id:'decor',title:'Укрась город 10 разными видами декора',metric:'decorKinds',target:10}
  ]}
].map(ch=>Object.freeze({...ch,steps:Object.freeze(ch.steps.map(x=>Object.freeze({...x})))})));

export function cityChapterViews(city,catalog,claimed=[],now=Date.now()){
  const s=cityStats(city,catalog,now);
  const readyDecor=new Set((city.objects||[]).filter(o=>!o.stored&&!isConstructing(o,now)&&catalog[o.kind]?.category==='decor').map(o=>o.kind));
  const metrics={residents:s.population||s.residents||0,comfort:s.comfort||0,parks:s.parks||0,shops:s.shops||0,roads:s.roads||0,cityLevel:s.cityLevel||1,decorKinds:readyDecor.size};
  const claims=new Set(claimed);
  return CITY_CHAPTERS.map((chapter,i)=>{
    const steps=chapter.steps.map(step=>({...step,value:Math.max(0,Math.floor(Number(metrics[step.metric]||0))),complete:Number(metrics[step.metric]||0)>=step.target}));
    const completed=steps.every(step=>step.complete),claimedAlready=claims.has(chapter.id),previousDone=i===0||claims.has(CITY_CHAPTERS[i-1].id);
    return {id:chapter.id,title:chapter.title,description:chapter.description,steps,completed,claimed:claimedAlready,unlocked:previousDone,canClaim:previousDone&&completed&&!claimedAlready,
      reward:{kind:'world_decor',id:chapter.rewardDecor,title:WORLD_REWARD_DECOR_BY_ID[chapter.rewardDecor]?.title||chapter.rewardDecor,amount:1}};
  });
}
