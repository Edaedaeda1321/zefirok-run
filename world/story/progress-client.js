// D1 story progress for authenticated RC participants only.
// No local optimistic chapter unlocking, no wallets and no storage of initData.
export function createStoryProgressClient(initData,{fetchFn=fetch}={}){
 if(typeof initData!=='string'||!initData)throw new Error('Нужна подтверждённая Telegram-сессия.');
 async function request(op,fields={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetchFn('/api/world/story/progress',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json'},body:JSON.stringify({initData,op,...fields})
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true){const error=new Error(String(data?.error||'История временно недоступна.'));error.code=String(data?.code||'STORY_REQUEST_FAILED');throw error;}
   if(data.version!=='zeffi-story-rc1'||!Number.isInteger(data.chapter)||data.chapter<0||data.chapter>3||
    !Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.visited)||
    !Array.isArray(data.unlockedDistricts)||!Array.isArray(data.chapters)||!data.events||typeof data.canAdvance!=='boolean'||
    !Number.isInteger(data.palace?.stage)||data.palace.stage<1||data.palace.stage>10||data.palace?.contributionsEnabled!==false||!Number.isSafeInteger(data.palace?.revision))
    throw new Error('Сервер вернул некорректные данные истории.');
   return data;
  }finally{clearTimeout(timer);}
 }
 return Object.freeze({read:()=>request('state'),visit:placeId=>request('visit',{placeId}),advance:(expectedChapter,expectedRevision)=>request('advance',{expectedChapter,expectedRevision})});
}
