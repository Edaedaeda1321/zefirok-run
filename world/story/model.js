// Story-world v1 is a LOCAL demonstration, including on the tester route.
// Never pass this state to /api/world/mutate or to the personal-city save flow.
export const DEMO_VERSION = 1;
export const DEMO_STORAGE_KEY = 'zefirok-story-world-demo-v1';
export const PROJECT_GOAL = 1000;
export const FESTIVAL_GOAL=50_000_000;
export const FESTIVAL_MILESTONES=Object.freeze([12_500_000,30_000_000,FESTIVAL_GOAL]);
export const FESTIVAL_AMOUNTS=Object.freeze([100_000,500_000,1_000_000,5_000_000]);
export const BUILD_DURATION_MS = 45000;
export const KNOWN_PLACES = Object.freeze(['square','cafe','belkino','friends','station','festival','rabbit','mystery','community-garden']);
const integer = (value, fallback, max) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
export function createDemoState() {
  return {version:DEMO_VERSION, chapter:0, materials:400, visited:[], project:{community:340, personal:0, startedAt:0, readyAt:0, opened:false},festival:{community:0,personal:0,credits:2_000_000},whiteRabbitPreview:0};
}
export function sanitizeDemoState(raw, now=Date.now()) {
  const result=createDemoState();
  if (!raw || typeof raw!=='object' || raw.version!==DEMO_VERSION) return result;
  result.chapter=integer(raw.chapter,0,2);
  result.whiteRabbitPreview=integer(raw.whiteRabbitPreview,0,6);
  // Older v1 saves have no festival object. Preserve the existing garden and
  // never infer an actual server/shared payment from local saved values.
  if(raw.festival&&typeof raw.festival==='object'){
    const personal=integer(raw.festival.personal,0,FESTIVAL_GOAL);
    const community=Math.min(integer(raw.festival.community,0,FESTIVAL_GOAL),FESTIVAL_GOAL-personal);
    result.festival={community,personal,credits:integer(raw.festival.credits,2_000_000,60_000_000)};
  }
  result.materials=integer(raw.materials,400,10000);
  result.visited=Array.isArray(raw.visited)?[...new Set(raw.visited.filter(id=>KNOWN_PLACES.includes(id)))]:[];
  const project=raw.project;
  if(project && typeof project==='object') {
    const personal=integer(project.personal,0,PROJECT_GOAL);
    const community=Math.min(integer(project.community,340,PROJECT_GOAL),PROJECT_GOAL-personal);
    result.project={community,personal,startedAt:0,readyAt:0,opened:false};
    if(personal+community>=PROJECT_GOAL) {
      const startedAt=integer(project.startedAt,Math.max(1,now),now+BUILD_DURATION_MS);
      const valid=startedAt>0 && project.readyAt===startedAt+BUILD_DURATION_MS;
      result.project.startedAt=valid?startedAt:Math.max(1,now);
      result.project.readyAt=result.project.startedAt+BUILD_DURATION_MS;
      result.project.opened=valid && project.opened===true && now>=result.project.readyAt;
    }
  }
  return result;
}
export function projectStatus(state, now=Date.now()) {
  const p=state.project;
  if(p.community+p.personal<PROJECT_GOAL)return 'funding';
  if(now<p.readyAt)return 'building';
  return p.opened?'active':'opening';
}
export function projectTotal(state) {return state.project.community+state.project.personal;}
function completeFunding(next, now) {
  if(projectTotal(next)===PROJECT_GOAL && !next.project.readyAt) {
    next.project.startedAt=Math.max(1,now);
    next.project.readyAt=next.project.startedAt+BUILD_DURATION_MS;
  }
  return next;
}
function copy(state) {return {...state,visited:[...state.visited],project:{...state.project},festival:{...state.festival}};}
export function contribute(state, amount, now=Date.now()) {
  if(![25,50,100].includes(amount))throw new Error('INVALID_AMOUNT');
  if(projectStatus(state,now)!=='funding')throw new Error('PROJECT_NOT_FUNDING');
  const accepted=Math.min(amount,PROJECT_GOAL-projectTotal(state));
  if(accepted>state.materials)throw new Error('INSUFFICIENT_DEMO_MATERIALS');
  const next=copy(state); next.materials-=accepted; next.project.personal+=accepted;
  return {state:completeFunding(next,now),accepted};
}
export function simulateCommunityHelp(state, now=Date.now()) {
  if(projectStatus(state,now)!=='funding')throw new Error('PROJECT_NOT_FUNDING');
  const next=copy(state);next.project.community+=Math.min(200,PROJECT_GOAL-projectTotal(state));
  return completeFunding(next,now);
}
export function addDemoMaterials(state) {const next=copy(state);next.materials=Math.min(10000,next.materials+200);return next;}
export function openProject(state, now=Date.now()) {
  if(projectStatus(state,now)!=='opening')throw new Error('PROJECT_NOT_READY');
  const next=copy(state);next.project.opened=true;return next;
}
export function setDemoChapter(state, chapter) {
  if(!Number.isInteger(chapter)||chapter<0||chapter>2)throw new Error('INVALID_CHAPTER');
  return {...copy(state),chapter};
}
export function visitPlace(state, id) {
  if(!KNOWN_PLACES.includes(id))throw new Error('UNKNOWN_PLACE');
  const next=copy(state);if(!next.visited.includes(id))next.visited.push(id);return next;
}
export function loadDemo(storage, now=Date.now()) {
  try {const value=storage?.getItem(DEMO_STORAGE_KEY);return {state:sanitizeDemoState(value?JSON.parse(value):null,now),persistent:!!storage};}
  catch {return {state:createDemoState(),persistent:false};}
}
export function saveDemo(storage,state) {
  try {if(!storage)return false;storage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function resetDemo(storage) {
  try {storage?.removeItem(DEMO_STORAGE_KEY);}catch { /* Never clear another feature's storage. */ }
  return createDemoState();
}

// This is a versioned LOCAL tester simulation, not real community fundraising.
// Wallet-backed contributions need a separate server-authoritative D1 design.
export function festivalTotal(state){return state.festival.community+state.festival.personal;}
export function festivalStage(state){
 const total=festivalTotal(state);
 return total<FESTIVAL_MILESTONES[0]?'stage_a':total<FESTIVAL_MILESTONES[1]?'stage_b':total<FESTIVAL_GOAL?'stage_c':'complete';
}
export function festivalNextGoal(state){
 const total=festivalTotal(state);
 return FESTIVAL_MILESTONES.find(goal=>total<goal)||FESTIVAL_GOAL;
}
export function contributeFestival(state,amount){
 if(state.chapter<1)throw new Error('FESTIVAL_CHAPTER_LOCKED');
 if(!FESTIVAL_AMOUNTS.includes(amount))throw new Error('FESTIVAL_INVALID_AMOUNT');
 const total=festivalTotal(state);
 if(total===FESTIVAL_GOAL)throw new Error('FESTIVAL_COMPLETE');
 const accepted=Math.min(amount,festivalNextGoal(state)-total);
 if(accepted>state.festival.credits)throw new Error('INSUFFICIENT_FESTIVAL_DEMO_POINTS');
 const next=copy(state);
 next.festival.personal+=accepted;next.festival.credits-=accepted;
 return {state:next,accepted,advanced:festivalStage(next)!==festivalStage(state)};
}
export function simulateFestivalHelp(state){
 if(state.chapter<1)throw new Error('FESTIVAL_CHAPTER_LOCKED');
 if(festivalTotal(state)>=FESTIVAL_GOAL)throw new Error('FESTIVAL_COMPLETE');
 const accepted=Math.min(2_500_000,festivalNextGoal(state)-festivalTotal(state));
 const next=copy(state);next.festival.community+=accepted;
 return {state:next,accepted,advanced:festivalStage(next)!==festivalStage(state)};
}
export function addFestivalDemoPoints(state){
 const next=copy(state);next.festival.credits=Math.min(60_000_000,next.festival.credits+5_000_000);return next;
}
export function setWhiteRabbitPreview(state,stage){
 if(!Number.isInteger(stage)||stage<0||stage>6)throw new Error('INVALID_WHITE_RABBIT_STAGE');
 const next=copy(state);next.whiteRabbitPreview=stage;return next;
}
