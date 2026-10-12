// Zeffi bus sprites: four AUTHORED directions of one approved pink city bus.
// Render-only art. No model/state, economy, API or route changes.
export const BUS_ART_VERSION = 'rose-bus-4-direction-v3';
export const BUS_ART = Object.freeze({
 file:'./assets/transport-v3/bus-rose-atlas.webp',
 headings:4,columns:2,width:384,height:384,anchorX:192,anchorY:302,scale:.27,
 directions:Object.freeze(['se','sw','nw','ne']),
});
let atlas=null,loading=null,lastFailure=0;
export function busArtStatus(){return {version:BUS_ART_VERSION,ready:!!atlas,loading:!!loading,failed:lastFailure>0};}
export function preloadBusArt(){
 if(atlas)return Promise.resolve(atlas);
 if(loading)return loading;
 if(typeof Image==='undefined')return Promise.reject(new Error('Bus sprites require a browser'));
 loading=new Promise((resolve,reject)=>{
  const image=new Image();let done=false;
  const timer=setTimeout(()=>finish(new Error('Bus sprites load timeout')),12000);
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;
   if(error){lastFailure=Date.now();loading=null;reject(error);return;}
   atlas=image;lastFailure=0;loading=null;resolve(image);
   if(typeof window!=='undefined')window.dispatchEvent(new Event('zeffi-transit-sprites-ready'));
  };
  image.onload=()=>{
   if(image.naturalWidth!==768||image.naturalHeight!==768){finish(new Error('Unexpected bus sprite atlas dimensions'));return;}
   // Loading first is not enough on slower Telegram WebViews; decode before first draw.
   if(typeof image.decode==='function')image.decode().then(()=>finish(),finish);
   else finish();
  };
  image.onerror=()=>finish(new Error('Bus sprite atlas could not be loaded'));
  const embedded=typeof window!=='undefined'&&window.ZeffiEmbeddedBusAtlas;
  // Versioned URL invalidates the previously cached procedural/model atlas.
  image.src=embedded||BUS_ART.file+'?v='+BUS_ART_VERSION;
 });
 return loading;
}
// x+ -> south-east, y+ -> south-west, x- -> north-west, y- -> north-east.
// The bus only has these four real source views. Never mirror or rotate a sprite.
export function busModelHeading(bus){
 const dx=Number.isFinite(bus.dx)?bus.dx:1,dy=Number.isFinite(bus.dy)?bus.dy:0;
 const angle=Number.isFinite(bus.heading)?bus.heading:Math.atan2(dy,dx);
 return ((Math.round(angle/(Math.PI*2)*BUS_ART.headings)%BUS_ART.headings)+BUS_ART.headings)%BUS_ART.headings;
}
export function drawBusModel(ctx,bus,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 if(!atlas){if(!loading&&Date.now()-lastFailure>15000)preloadBusArt().catch(()=>{});return false;}
 const frame=busModelHeading(bus),a=BUS_ART;
 ctx.save();ctx.imageSmoothingEnabled=true;
 ctx.drawImage(atlas,(frame%a.columns)*a.width,Math.floor(frame/a.columns)*a.height,a.width,a.height,
  x-a.anchorX*a.scale,y-a.anchorY*a.scale,a.width*a.scale,a.height*a.scale);
 ctx.restore();return true;
}
