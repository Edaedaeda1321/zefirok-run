/* CC visual editor: no additional requests; saves into existing season visuals endpoint. */
function zspCcFields(page){
 const path='zspCc'+page;
 const val=name=>document.getElementById(path+name);
 return {path,val};
}
function zspCcRenderImage(page){
 const {val}=zspCcFields(page),image=val('ImageUrl'),preview=val('PreviewImage');
 if(!image||!preview)return;
 const fallback=page==='Rating'?'/assets/rating/v8/season-1-cafe-opening.webp':'/assets/season-pass/season_pass1.webp';
 preview.onerror=()=>{preview.onerror=null;preview.src=fallback};
 preview.src=String(image.value||'').trim()||fallback;
}
function zspCcFill(page,raw){
 const {val}=zspCcFields(page),data=raw||{},features=Array.isArray(data.features)?data.features:[];
 if(!val('Enabled'))return;
 val('Enabled').checked=data.enabled===true;
 for(const [id,text] of [['Title',data.title],['Subtitle',data.subtitle],['Description',data.description],['ImageUrl',data.imageUrl],['Feature1',features[0]],['Feature2',features[1]],['Feature3',features[2]]])val(id).value=String(text||'');
 zspCcRenderImage(page);
}
function zspCcRead(page){
 const {val}=zspCcFields(page);
 return {enabled:Boolean(val('Enabled')?.checked),title:String(val('Title')?.value||'').trim(),subtitle:String(val('Subtitle')?.value||'').trim(),description:String(val('Description')?.value||'').trim(),imageUrl:String(val('ImageUrl')?.value||'').trim(),features:[1,2,3].map(n=>String(val('Feature'+n)?.value||'').trim())};
}
function zspCcPreview(page){
 const rating=page==='Rating';
 const season=rating?ratingVisualSelectedSeason():state.pass?.selected;
 if(!season)return;
 const config={surface:rating?'rating':page==='Main'?'main':'pass',id:String(season.id),userId:'cc-preview',status:'active',seasonTitle:season.title,heroImage:rating?String($('ratingVisualHeroImage')?.value||''):String($('passVisualHeroImage')?.value||''),premiere:{...zspCcRead(page),enabled:true},reward:rating?season.reward:null,action:()=>{}};
 window.ZeffiSeasonPremiere?.openManual(config);
}
document.addEventListener('input',event=>{const input=event.target;
 if(input?.id==='zspCcMainImageUrl')zspCcRenderImage('Main');
 if(input?.id==='zspCcPassImageUrl')zspCcRenderImage('Pass');
 if(input?.id==='zspCcRatingImageUrl')zspCcRenderImage('Rating');
});
document.addEventListener('change',event=>{const id=event.target?.id||'';if(/^zspCc(?:Main|Pass|Rating)ImageUrl$/.test(id))zspCcRenderImage(id.slice(5,id.indexOf('ImageUrl')))});
document.addEventListener('click',event=>{
 const preview=event.target.closest?.('[data-zsp-cc-preview]');if(preview)zspCcPreview(preview.dataset.zspCcPreview);
 const clear=event.target.closest?.('[data-zsp-cc-clear]');if(clear){const page=clear.dataset.zspCcClear;const input=document.getElementById('zspCc'+page+'ImageUrl');if(input){input.value='';zspCcRenderImage(page)}}
});
