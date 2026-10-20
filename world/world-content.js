// World Control Center P2. Pure, versioned editorial/live-ops configuration.
// No map geometry, funding goals, milestones, story gates, wallet accounting or ownership is editable.
const PROJECTS={
 garden:{enabled:true,announcement:'Сад встреч растёт благодаря вашим общим вкладам.'},
 festival:{enabled:false,announcement:'Зеффи ещё готовит чертежи. Скоро здесь начнётся новая история!'}
};
const EVENTS={
 'garden-seeds':['Первые ростки','В саду появились первые ростки. Жители начали готовить клумбы.','Садовники принесли семена'],
 'garden-flowers':['Расцветают клумбы','Новые цветы украшают дорожки, а жители заботятся о посадках.','На площадке стало больше цветов'],
 'garden-ribbons':['Украшаем дорожки','Город готовит ленты и цветочные гирлянды к открытию сада.','Появились гирлянды и украшения'],
 'garden-opening':['Открытие Сада встреч','Общий сбор завершён! Жители могут праздновать открытие нового сада.','Сад открыт для прогулок'],
 'festival-supplies':['Привезли материалы','Рабочие собрали материалы, площадка постепенно преображается.','У площадки появились материалы и рабочие'],
 'festival-foundation':['Заложен фундамент','Первый большой строительный этап завершён — готов фундамент.','Здание перешло на следующую стадию'],
 'festival-walls':['Строим стены','Рабочие возводят стены, а жители наблюдают за переменами.','На стройке кипит работа'],
 'festival-dome':['Стены и купол','Здание выросло: готова новая большая строительная стадия.','Появились стены и купол'],
 'festival-decor':['Город украшает зал','Жители развесили гирлянды и готовят праздничный вход.','Вокруг здания появляются украшения'],
 'festival-opening':['Большое открытие','Дом фестивалей Зеффи готов! Город встречает новый праздник.','Дом фестивалей открыт']
};
const CHAPTERS={
 welcome:{title:'Первые прогулки',description:'Познакомься с сердцем города, кафе и парком Белкино.'},
 together:{title:'Вместе строим город',description:'Исследуй квартал, станцию и Сад встреч. Когда общий сбор на сад завершится, откроется история Белого Кролика.'},
 festival:{title:'Праздник Зеффи',description:'Исследуй Дом фестивалей и Белого Кролика. Завершите строительство вместе со всем городом.'}
};
const REQUESTS={
 flowers:{enabled:true,name:'Цветочный уголок',speaker:'Мия',message:'Нашему городку не хватает цветов! Давай посадим новую клумбу.',objective:'Купить и поставить новую клумбу',reward:{points:100,treats:0}},
 park:{enabled:true,name:'Место для прогулок',speaker:'Лея',message:'Хочу гулять среди деревьев. Построим первый парк?',objective:'Завершить строительство первого парка',reward:{points:300,treats:1}},
 road:{enabled:true,name:'Дорога к дому',speaker:'Тим',message:'До некоторых домов пока трудно добраться. Поможешь соединить дорогу?',objective:'Новой дорогой подключить постройку',reward:{points:150,treats:0}},
 comfort:{enabled:true,name:'Уютный городок',speaker:'Мия',message:'Здесь становится так уютно! Давай украсим наш район ещё немного.',objective:'Достичь 30 единиц уюта',reward:{points:200,treats:0}},
 cafe:{enabled:true,name:'Первое кафе',speaker:'Тим',message:'Так хочется посидеть за чашечкой кофе. Откроем первое заведение?',objective:'Завершить заведение с доступом к дороге',reward:{points:400,treats:2}},
 neighbors:{enabled:true,name:'Новые соседи',speaker:'Лея',message:'В городке становится веселее! Пригласим ещё пару соседей?',objective:'Достичь 4 жителей',reward:{points:250,treats:0}}
};
export const WORLD_CONTENT_SCHEMA=1;
export const WORLD_PROJECT_IDS=Object.freeze(Object.keys(PROJECTS));
export const WORLD_EVENT_IDS=Object.freeze(Object.keys(EVENTS));
export const WORLD_CHAPTER_IDS=Object.freeze(Object.keys(CHAPTERS));
export const WORLD_REQUEST_IDS=Object.freeze(Object.keys(REQUESTS));
export function defaultWorldContent(){
 return {schema:WORLD_CONTENT_SCHEMA,projects:structuredClone(PROJECTS),
  events:Object.fromEntries(Object.entries(EVENTS).map(([id,[title,description,change]])=>[id,{visible:true,title,description,change}])),
  chapters:structuredClone(CHAPTERS),residents:{dailyLimit:2,templates:structuredClone(REQUESTS)}};
}
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
const error=s=>{throw Error('WORLD_CONTENT_INVALID: '+s);};
const text=(v,min,max)=>typeof v==='string'&&v.trim()===v&&v.length>=min&&v.length<=max&&!/[<>\u0000-\u001f\u007f]/.test(v);
const bool=v=>typeof v==='boolean';
const natural=(v,limit)=>Number.isSafeInteger(v)&&v>=0&&v<=limit;
export function validateWorldContent(input){
 if(!exact(input,['schema','projects','events','chapters','residents'])||input.schema!==WORLD_CONTENT_SCHEMA)error('Схема или поля конфигурации.');
 if(!exact(input.projects,WORLD_PROJECT_IDS)||!exact(input.events,WORLD_EVENT_IDS)||!exact(input.chapters,WORLD_CHAPTER_IDS))error('Нужно сохранить все исходные идентификаторы проектов, событий и глав.');
 const projects={};for(const id of WORLD_PROJECT_IDS){const p=input.projects[id];if(!exact(p,['enabled','announcement'])||!bool(p.enabled)||!text(p.announcement,1,250))error('Неверный проект '+id);projects[id]={enabled:p.enabled,announcement:p.announcement};}
 const events={};for(const id of WORLD_EVENT_IDS){const e=input.events[id];if(!exact(e,['visible','title','description','change'])||!bool(e.visible)||!text(e.title,2,90)||!text(e.description,5,650)||!text(e.change,3,180))error('Неверное событие '+id);events[id]={visible:e.visible,title:e.title,description:e.description,change:e.change};}
 const chapters={};for(const id of WORLD_CHAPTER_IDS){const c=input.chapters[id];if(!exact(c,['title','description'])||!text(c.title,2,90)||!text(c.description,5,650))error('Неверная глава '+id);chapters[id]={title:c.title,description:c.description};}
 if(!exact(input.residents,['dailyLimit','templates'])||!natural(input.residents.dailyLimit,2)||input.residents.dailyLimit<1||!exact(input.residents.templates,WORLD_REQUEST_IDS))error('Неверная настройка просьб жителей.');
 const templates={};for(const id of WORLD_REQUEST_IDS){const t=input.residents.templates[id];if(!exact(t,['enabled','name','speaker','message','objective','reward'])||!bool(t.enabled)||!text(t.name,2,90)||!text(t.speaker,1,50)||!text(t.message,5,350)||!text(t.objective,3,170)||!exact(t.reward,['points','treats'])||!natural(t.reward.points,3000)||!natural(t.reward.treats,30)||t.reward.points+t.reward.treats===0)error('Неверная просьба или награда '+id);templates[id]={enabled:t.enabled,name:t.name,speaker:t.speaker,message:t.message,objective:t.objective,reward:{points:t.reward.points,treats:t.reward.treats}};}
 return {schema:WORLD_CONTENT_SCHEMA,projects,events,chapters,residents:{dailyLimit:input.residents.dailyLimit,templates}};
}
