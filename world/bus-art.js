// Original 3D bus mesh, baked into 16 orthographic views per livery.
// All views share a ground-center anchor. No Canvas face imitation/mirroring.
export const BUS_ART_VERSION = 'mesh-bus-v2';
export const BUS_ART = Object.freeze({file:'./assets/transport-v2/bus-atlas.webp',headings:16,columns:4,width:320,height:256,anchorX:160,anchorY:184,scale:.28});
let atlas=null,loading=null,lastFailure=0;
export function busArtStatus(){return {version:BUS_ART_VERSION,ready:!!atlas,loading:!!loading,failed:lastFailure>0};}
export function preloadBusArt(){
 if(atlas)return Promise.resolve(atlas);
 if(loading)return loading;
 if(typeof Image==='undefined')return Promise.reject(new Error('Bus art requires a browser'));
 loading=new Promise((resolve,reject)=>{
  const image=new Image();let done=false;
  const timer=setTimeout(()=>finish(new Error('Bus atlas load timeout')),12000);
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;
   if(error){lastFailure=Date.now();loading=null;reject(error);return;}
   atlas=image;lastFailure=0;loading=null;resolve(image);
   if(typeof window!=='undefined')window.dispatchEvent(new Event('zeffi-transit-sprites-ready'));
  };
  image.onload=()=>image.naturalWidth===1280&&image.naturalHeight===2048?finish():finish(new Error('Unexpected bus atlas dimensions'));
  image.onerror=()=>finish(new Error('Bus atlas could not be loaded'));
  image.src=(typeof window!=='undefined'&&window.ZeffiEmbeddedBusAtlas)||BUS_ART.file;
 });
 return loading;
}
export function busModelHeading(bus){
 const dx=Number.isFinite(bus.dx)?bus.dx:1,dy=Number.isFinite(bus.dy)?bus.dy:0;
 const angle=Number.isFinite(bus.heading)?bus.heading:Math.atan2(dy,dx);
 return ((Math.round(angle/(Math.PI*2)*BUS_ART.headings)%BUS_ART.headings)+BUS_ART.headings)%BUS_ART.headings;
}
export function drawBusModel(ctx,bus,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 if(!atlas){if(!loading&&Date.now()-lastFailure>15000)preloadBusArt().catch(()=>{});return false;}
 const frame=(Math.abs(Math.trunc(bus.index||0))%2)*16+busModelHeading(bus),a=BUS_ART;
 ctx.save();ctx.imageSmoothingEnabled=true;
 ctx.drawImage(atlas,(frame%a.columns)*a.width,Math.floor(frame/a.columns)*a.height,a.width,a.height,x-a.anchorX*a.scale,y-a.anchorY*a.scale,a.width*a.scale,a.height*a.scale);
 ctx.restore();return true;
}
