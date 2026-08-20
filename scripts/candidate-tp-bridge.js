(() => {
  if (window.__ZEFIROK_CANDIDATE_TP_BRIDGE__) return;
  window.__ZEFIROK_CANDIDATE_TP_BRIDGE__ = { active:true, version:"1.0", failClosed:true };
  const nativeFetch = window.fetch.bind(window);
  const SESSION_KEY = "zefirok-owner-session-v1";
  const PROXY = "/api/owner/test-project/game";
  const fakeUser = { id:"tp-candidate", first_name:"TP Candidate", last_name:"", username:"tp_candidate", language_code:"ru", is_premium:false };
  const button = () => ({ show(){return this},hide(){return this},onClick(){return this},offClick(){return this},setText(){return this},enable(){return this},disable(){return this} });
  window.Telegram = { ...(window.Telegram||{}), WebApp:{
    initData:"tp-sandbox-5.5", initDataUnsafe:{user:fakeUser,query_id:"tp-candidate",auth_date:0,hash:"tp-candidate"}, version:"9.9", platform:"ios", colorScheme:"light",
    viewportHeight:innerHeight,viewportStableHeight:innerHeight,safeAreaInset:{top:0,right:0,bottom:0,left:0},contentSafeAreaInset:{top:0,right:0,bottom:0,left:0},CloudStorage:null,
    BackButton:button(),MainButton:button(),SecondaryButton:button(),HapticFeedback:{impactOccurred(){},notificationOccurred(){},selectionChanged(){}},ready(){},expand(){},close(){try{parent?.postMessage?.({type:"zefirok-close-overlay"},"*")}catch{}},onEvent(){},offEvent(){},openLink(){},openTelegramLink(){}
  }};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Candidate-TP":"1"}});
  const blocked=(message,status=403)=>json({ok:false,testProject:true,candidateTp:true,isolated:true,productionWrites:false,error:message},status);
  async function bodyValue(body){if(body==null)return{};if(typeof body==="string"){try{return JSON.parse(body)}catch{return{raw:body.slice(0,12000)}}}if(body instanceof URLSearchParams)return Object.fromEntries(body.entries());if(typeof FormData!=="undefined"&&body instanceof FormData){const out={};for(const [k,v] of body.entries())if(typeof v==="string")out[k]=v;return out}return typeof body==="object"?body:{}}
  window.fetch=async(input,init={})=>{
    const original=input instanceof Request?input.url:String(input||"");let url;try{url=new URL(original,location.href)}catch{return String(original).startsWith("/api/")?blocked("Candidate TP: invalid API URL",418):nativeFetch(input,init)}
    if(url.origin!==location.origin||!url.pathname.startsWith("/api/"))return nativeFetch(input,init);
    if(url.pathname.startsWith("/api/owner/"))return blocked("Candidate TP child cannot call owner API directly.",403);
    let ownerSession="";try{ownerSession=String(localStorage.getItem(SESSION_KEY)||"")}catch{}
    if(!ownerSession)return blocked("Candidate TP: owner session is missing.",401);
    const source=input instanceof Request?input:null,method=String(init.method||source?.method||"GET").toUpperCase();let requestBody=init.body;if(requestBody==null&&source&&method!=="GET"&&method!=="HEAD"){try{requestBody=await source.clone().text()}catch{requestBody=null}}
    const payload=await bodyValue(requestBody);if(payload&&typeof payload==="object")payload.initData="tp-sandbox-5.5";
    const response=await nativeFetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json","X-Candidate-TP":"1"},body:JSON.stringify({initData:"",ownerSession,path:url.pathname,method,query:Object.fromEntries(url.searchParams.entries()),payload}),cache:"no-store",credentials:"same-origin",signal:init.signal||source?.signal});
    const envelope=await response.json().catch(()=>({ok:false,error:"Candidate TP proxy returned invalid response."}));
    if(!response.ok||!envelope?.ok||!("data" in envelope))return json(envelope||{ok:false,error:"Candidate TP proxy error"},response.status||500);
    return json(envelope.data,Number(envelope.proxyStatus||200));
  };
  try{const X=window.XMLHttpRequest,n=X?.prototype?.open;if(n)X.prototype.open=function(method,url,...rest){const parsed=new URL(String(url||""),location.href);if(parsed.pathname.startsWith("/api/"))throw new Error(`Candidate TP XHR blocked: ${parsed.pathname}`);return n.call(this,method,url,...rest)}}catch{}
  try{navigator.sendBeacon=()=>false}catch{}
})();
