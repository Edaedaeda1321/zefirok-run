/* CC visual editor: no additional requests; saves into existing season visuals endpoint. */
const zspCcLegacyButtonIcons=new Set(["/assets/ui/icon_battlepass.webp","/assets/season-pass/season.webp","/assets/ui/icon_itog_reiting_season.webp"]);
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
function zspCcRenderIcon(page){
 const {val}=zspCcFields(page),input=val('IconUrl'),preview=val('IconPreview');
 if(!input||!preview)return;
 const fallback='/assets/ui/icon_o_sezone.webp';
 preview.onerror=()=>{preview.onerror=null;preview.src=fallback};
 preview.src=String(input.value||'').trim()||fallback;
}
function zspCcFill(page,raw){
 const {val}=zspCcFields(page),data=raw||{},features=Array.isArray(data.features)?data.features:[];
 if(!val('Enabled'))return;
 val('Enabled').checked=data.enabled===true;
 for(const [id,text] of [['Title',data.title],['Subtitle',data.subtitle],['Description',data.description],['ImageUrl',data.imageUrl],['IconUrl',data.iconUrl],['Feature1',features[0]],['Feature2',features[1]],['Feature3',features[2]]])val(id).value=String(text||'');
 const iconInput=val('IconUrl');if(iconInput&&zspCcLegacyButtonIcons.has(iconInput.value))iconInput.value='';
 zspCcRenderImage(page);zspCcRenderIcon(page);
}
function zspCcRead(page){
 const {val}=zspCcFields(page);
 return {enabled:Boolean(val('Enabled')?.checked),title:String(val('Title')?.value||'').trim(),subtitle:String(val('Subtitle')?.value||'').trim(),description:String(val('Description')?.value||'').trim(),imageUrl:String(val('ImageUrl')?.value||'').trim(),iconUrl:String(val('IconUrl')?.value||'').trim(),features:[1,2,3].map(n=>String(val('Feature'+n)?.value||'').trim())};
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
 if(input?.id==='zspCcMainIconUrl')zspCcRenderIcon('Main');
 if(input?.id==='zspCcPassIconUrl')zspCcRenderIcon('Pass');
 if(input?.id==='zspCcRatingIconUrl')zspCcRenderIcon('Rating');
});
document.addEventListener('change',event=>{const id=event.target?.id||'';if(/^zspCc(?:Main|Pass|Rating)ImageUrl$/.test(id))zspCcRenderImage(id.slice(5,id.indexOf('ImageUrl')));if(/^zspCc(?:Main|Pass|Rating)IconUrl$/.test(id))zspCcRenderIcon(id.slice(5,id.indexOf('IconUrl')))});
document.addEventListener('click',event=>{
 const preview=event.target.closest?.('[data-zsp-cc-preview]');if(preview)zspCcPreview(preview.dataset.zspCcPreview);
 const clear=event.target.closest?.('[data-zsp-cc-clear]');if(clear){const page=clear.dataset.zspCcClear;const input=document.getElementById('zspCc'+page+'ImageUrl');if(input){input.value='';zspCcRenderImage(page)}}
 const iconClear=event.target.closest?.('[data-zsp-cc-icon-clear]');if(iconClear){const page=iconClear.dataset.zspCcIconClear;const input=document.getElementById('zspCc'+page+'IconUrl');if(input){input.value='';zspCcRenderIcon(page)}}
});
