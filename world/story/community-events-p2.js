// P2 optional editorial overrides of RC-5 milestones from a signed fund snapshot.
// Thresholds, stage counts and award logic are ALWAYS those of the original module.
import {communityChronicle as baseChronicle,communityEvent as baseEvent,
 newlyReachedCommunityEvents as baseReached,communityVisualPlan as baseVisual} from './community-events.js?v=garden60k1';
export {COMMUNITY_EVENT_DEFINITIONS,paintCommunityScene} from './community-events.js?v=garden60k1';
function decorate(snapshot,event){
 const e=snapshot?.content?.events?.[event.id];
 if(!e)return event;
 if(e.visible===false)return null;
 return {...event,title:String(e.title||event.title),description:String(e.description||event.description),change:String(e.change||event.change)};
}
export function communityChronicle(snapshot,id){
 const c=baseChronicle(snapshot,id);if(!c)return null;
 const events=c.events.map(e=>decorate(snapshot,e)).filter(Boolean);
 const achieved=events.filter(e=>e.complete),next=events.find(e=>!e.complete)||null;
 return {...c,events,achieved:achieved.length,latest:achieved.at(-1)||null,next};
}
export function communityEvent(snapshot,eventId){
 const e=baseEvent(snapshot,eventId);return e?decorate(snapshot,e):null;
}
export function newlyReachedCommunityEvents(previous,next){
 // First signed snapshot must not trigger retroactive celebrations.
 return baseReached(previous,next).map(e=>decorate(next,e)).filter(Boolean);
}
export function communityVisualPlan(snapshot,chapter=0){
 // World decorative effects are tied to real money milestones, not editorial visibility.
 return baseVisual(snapshot,chapter);
}
