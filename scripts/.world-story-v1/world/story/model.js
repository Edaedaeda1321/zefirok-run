// Story-world v1 is a LOCAL demonstration, including on the tester route.
// Never pass this state to /api/world/mutate or to the personal-city save flow.
export const DEMO_VERSION = 1;
export const DEMO_STORAGE_KEY = 'zefirok-story-world-demo-v1';
export const PROJECT_GOAL = 1000;
export const BUILD_DURATION_MS = 45000;
export const KNOWN_PLACES = Object.freeze(['square','cafe','belkino','friends','station','festival','rabbit','mystery','community-garden']);
const integer = (value, fallback, max) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
export function createDemoState() {
  return {version:DEMO_VERSION, chapter:0, materials:400, visited:[], project:{community:340, personal:0, startedAt:0, readyAt:0, opened:false}};
}
export function sanitizeDemoState(raw, now=Date.now()) {
  const result=createDemoState();
  if (!raw || typeof raw!=='object' || raw.version!==DEMO_VERSION) return result;
  result.chapter=integer(raw.chapter,0,2);
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
function copy(state) {return {...state,visited:[...state.visited],project:{...state.project}};}
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
