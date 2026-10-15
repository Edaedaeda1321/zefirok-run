// Hosted story only. Signed Telegram initData stays in this closure, never in
// localStorage, URLs, HTML, diagnostics or D1 snapshots. Standalone never calls it.
const projectIds=['garden','festival'];
const safe=n=>Number.isSafeInteger(n)&&n>=0;
function normalized(payload){
 if(payload?.ok!==true||payload?.mode!=='shared-fund'||payload?.globalSync!==true)
  throw new Error('Сервер не подтвердил общий фонд. Вклады недоступны.');
 const projects={};
 for(const id of projectIds){
  const p=payload.projects?.[id];
  if(!p||p.id!==id||!safe(p.total)||!safe(p.goal)||p.goal===0||p.total>p.goal||
     !safe(p.revision)||!safe(p.stage)||!safe(p.next)||p.next>p.goal||p.next<p.total||
     !Array.isArray(p.milestones)||p.milestones.some(n=>!safe(n)||n>p.goal))
   throw new Error('Сервер вернул некорректное состояние фонда.');
  projects[id]={id,title:String(p.title||''),total:p.total,goal:p.goal,revision:p.revision,stage:p.stage,
   contributionsEnabled:payload.content?.projects?.[id]?.enabled!==false,announcement:String(payload.content?.projects?.[id]?.announcement||''),
   next:p.next,finished:p.total===p.goal,milestones:[...p.milestones]};
 }
 const points=payload.viewer?.walletPoints;
 if(!safe(points))throw new Error('Не удалось подтвердить реальный баланс очков.');
 const contributedPoints={};
 for(const id of projectIds){
  const n=payload.viewer?.contributedPoints?.[id];
  if(!safe(n))throw new Error('Не удалось загрузить историю вкладов.');
  contributedPoints[id]=n;
 }
 return {projects,walletPoints:points,contributedPoints,writesEnabled:payload.walletWrites===true,readAt:Date.now(),
  receipt:payload.receipt?{...payload.receipt}:null,repeated:payload.repeated===true,
  content:payload.content&&typeof payload.content==='object'?payload.content:null};
}
export function createSharedFundClient(initData,{fetchFn=fetch}={}){
 if(typeof initData!=='string'||!initData)throw new Error('Подписанная Telegram-сессия не получена.');
 async function request(path,body={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetchFn(`/api/world/community/${path}`,{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',
    signal:controller.signal,body:JSON.stringify({initData,...body})
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok){const err=new Error(String(data?.error||'Общий фонд временно недоступен.'));err.code=String(data?.code||'COMMUNITY_REQUEST_FAILED');throw err;}
   return normalized(data);
  }finally{clearTimeout(timer);}
 }
 return Object.freeze({load:()=>request('state'),contribute:payload=>request('contribute',payload)});
}
export const sharedFundQuote=(project,requested)=>{
 if(!project||project.finished||project.contributionsEnabled===false||!safe(project.total)||!safe(project.next)||!safe(project.revision)||
    !safe(requested)||requested<1||requested>2_000_000)return null;
 const accepted=Math.min(requested,project.next-project.total);
 return accepted>0?{projectId:project.id,amountPoints:requested,expectedDebitPoints:accepted,expectedRevision:project.revision}:null;
};
export function mapStateWithFund(local,shared){
 const garden=shared?.projects?.garden,festival=shared?.projects?.festival;
 // Missing D1 state is NOT replaced with old local donation numbers.
 // Keep the garden at the earliest non-claimable construction stage and Festival at A until a signed D1 read succeeds.
 const completed=Boolean(garden?.finished);
 return {...local,chapter:local.chapter,
  meetingGardenStage:completed?10:garden&&garden.goal>0?Math.max(1,Math.min(9,1+Math.floor(garden.total/garden.goal*9))):1,
  project:{community:completed?1000:0,personal:0,startedAt:completed?1:0,readyAt:completed?1:0,opened:completed},
  festival:{community:festival?.total||0,personal:0,credits:0}};
}
