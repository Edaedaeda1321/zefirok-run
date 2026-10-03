(()=>{
'use strict';
if(window.SweetRunPlatform)return;

const VERSION='1.1.0';
const LEGACY_SESSION_PREFIX='sr-session:';
const SESSION_KEY='sweet-run-player-session-v1';
const NATIVE_BOOTSTRAP_KEY='__SWEET_RUN_NATIVE_BOOTSTRAP__';
const NATIVE_HANDLER='sweetRunBridge';

function telegramWebApp(){
  try{return window.Telegram?.WebApp||null;}catch{return null;}
}
function nativeBootstrap(){
  try{
    const value=window[NATIVE_BOOTSTRAP_KEY];
    return value&&typeof value==='object'?value:null;
  }catch{return null;}
}
function nativeMessageHandler(){
  try{return window.webkit?.messageHandlers?.[NATIVE_HANDLER]||null;}catch{return null;}
}
function kind(){
  if(nativeMessageHandler()||nativeBootstrap()?.platform==='ios')return 'ios';
  const tg=telegramWebApp();
  if(tg&&(tg.initData||tg.platform))return 'telegram';
  return 'web';
}
function telegramInitData(){
  let value='';
  try{value=String(telegramWebApp()?.initData||'');}catch{}
  if(value)return value;
  try{return String(sessionStorage.getItem('zefirok-telegram-init-data')||'');}catch{return '';}
}
function sessionToken(){
  const bootstrap=nativeBootstrap();
  const injected=String(bootstrap?.sessionToken||bootstrap?.accessToken||'').trim();
  if(injected)return injected;
  try{return String(sessionStorage.getItem(SESSION_KEY)||'').trim();}catch{return '';}
}
function legacyInitData(){
  const initData=telegramInitData();
  if(initData)return initData;
  const token=sessionToken();
  return token?`${LEGACY_SESSION_PREFIX}${token}`:'';
}
function normalizedUser(raw){
  if(!raw||typeof raw!=='object'||raw.id==null)return null;
  return {
    id:String(raw.id),
    first_name:String(raw.first_name??raw.firstName??''),
    last_name:String(raw.last_name??raw.lastName??''),
    username:String(raw.username||''),
    photo_url:String(raw.photo_url??raw.photoUrl??''),
    language_code:String(raw.language_code??raw.languageCode??''),
    is_premium:Boolean(raw.is_premium??raw.isPremium)
  };
}
function playerUser(){
  const nativeUser=normalizedUser(nativeBootstrap()?.user);
  if(nativeUser)return nativeUser;
  try{return normalizedUser(telegramWebApp()?.initDataUnsafe?.user);}catch{return null;}
}
function snapshot(){
  const initData=telegramInitData();
  const token=sessionToken();
  return Object.freeze({
    platform:kind(),
    authenticated:Boolean(initData||token),
    initData,
    sessionToken:token,
    user:playerUser()
  });
}
function headers(base={}){
  const output=new Headers(base||{});
  const token=sessionToken();
  if(token&&!output.has('Authorization'))output.set('Authorization',`Bearer ${token}`);
  return output;
}
function body(base={}){
  const output=base&&typeof base==='object'&&!Array.isArray(base)?{...base}:{};
  const credential=legacyInitData();
  const current=String(output.initData??output.init_data??'').trim();
  if(credential&&!current)output.initData=credential;
  return output;
}
function setSession(value=''){
  const token=String(value||'').trim();
  try{
    if(token)sessionStorage.setItem(SESSION_KEY,token);
    else sessionStorage.removeItem(SESSION_KEY);
  }catch{}
  try{window.dispatchEvent(new CustomEvent('sweet-run-auth-changed',{detail:snapshot()}));}catch{}
}
function postNative(type,payload={}){
  const handler=nativeMessageHandler();
  if(!handler?.postMessage)return false;
  try{handler.postMessage({type:String(type||''),payload:payload&&typeof payload==='object'?payload:{}});return true;}catch{return false;}
}
function haptic(kindValue='selection',value=''){
  const hapticKind=String(kindValue||'selection');
  const hapticValue=String(value||'');
  if(kind()==='ios'&&postNative('haptic',{kind:hapticKind,value:hapticValue}))return true;
  try{
    const feedback=telegramWebApp()?.HapticFeedback;
    if(hapticKind==='impact')feedback?.impactOccurred?.(['light','medium','heavy','rigid','soft'].includes(hapticValue)?hapticValue:'light');
    else if(hapticKind==='notification')feedback?.notificationOccurred?.(['error','success','warning'].includes(hapticValue)?hapticValue:'success');
    else feedback?.selectionChanged?.();
    return Boolean(feedback);
  }catch{return false;}
}

window.SweetRunPlatform=Object.freeze({
  version:VERSION,
  kind,
  isNativeIOS:()=>kind()==='ios',
  isTelegram:()=>kind()==='telegram',
  identity:Object.freeze({user:playerUser}),
  auth:Object.freeze({snapshot,telegramInitData,legacyInitData,sessionToken,headers,body,setSession,hasPlayerAuth:()=>snapshot().authenticated}),
  haptic,
  postNative
});
try{window.dispatchEvent(new CustomEvent('sweet-run-platform-ready',{detail:{version:VERSION,platform:kind()}}));}catch{}
})();
