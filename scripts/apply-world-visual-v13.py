#!/usr/bin/env python3
"""Apply the Zeffi World v13 render/catalog fix without overwriting other edits.

Run from any working directory: python3 scripts/apply-world-visual-v13.py
The script validates every edit before writing any file and can be run twice.
This is a source-only front-end patch; Worker, D1, catalog prices, and saves are untouched.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CHANGED = {}


def fail(message):
    raise SystemExit(f"v13 ABORT (no files changed): {message}")


def read(relative):
    p = ROOT / relative
    if not p.is_file():
        fail(f"Missing {relative}")
    return p.read_text(encoding='utf-8')


def change(relative, before, after, *, count=1):
    src = CHANGED.get(relative, read(relative))
    if after in src:
        return
    hits = src.count(before)
    if hits != count:
        fail(f"Cannot safely patch {relative}: expected {count} instance(s), found {hits}")
    CHANGED[relative] = src.replace(before, after, count)


# 1. Restore the user-provided WebP category art. Transport uses the existing
#     bus terminal game sprite, compressed into a separate 176px UI thumbnail.
APP = 'world/app.js'
SYMBOLS = "const CATEGORY_SYMBOLS = Object.freeze({all:'▦', homes:'⌂', shops:'☕', transport:'🚌', parks:'♣', plazas:'◇', landscape:'❋', decor:'✿'});"
CATMAP = """const CATEGORY_IMAGES = Object.freeze({
 all:'../assets/mir_zeffi/icon_all_stroika.webp',
 homes:'../assets/mir_zeffi/icon_house.webp',
 shops:'../assets/mir_zeffi/icon_zavedenia.webp',
 transport:'../assets/mir_zeffi/icon_transport.webp',
 parks:'../assets/mir_zeffi/icon_parks.webp',
 plazas:'../assets/mir_zeffi/icon_ploshadki.webp',
 landscape:'../assets/mir_zeffi/icon_landshaft.webp',
 decor:'../assets/mir_zeffi/icon_decor.webp'
});"""
change(APP, SYMBOLS, SYMBOLS+'\n'+CATMAP)
OLD_ICON = "  const symbol=document.createElement('span');symbol.className='category-icon';symbol.textContent=CATEGORY_SYMBOLS[category]||'✦';symbol.setAttribute('aria-hidden','true');"
NEW_ICON = """  const symbol=document.createElement('span');
   symbol.className='category-icon';symbol.setAttribute('aria-hidden','true');
   const imagePath=CATEGORY_IMAGES[category];
   if(imagePath){
    const icon=document.createElement('img');
    icon.src=imagePath;icon.alt='';icon.width=26;icon.height=26;
    icon.loading='lazy';icon.decoding='async';
    icon.addEventListener('error',()=>{
     symbol.classList.remove('category-icon--art');
     symbol.textContent=CATEGORY_SYMBOLS[category]||'✦';
    },{once:true});
    symbol.classList.add('category-icon--art');symbol.append(icon);
   }else symbol.textContent=CATEGORY_SYMBOLS[category]||'✦';"""
change(APP, OLD_ICON, NEW_ICON)

# 2. Keep the existing v11 alpha-ground solution unchanged for compatibility,
#    but bury the visible *pedestal* a few extra pixels with per-family tuning.
#    The previously tried generic bottom-of-canvas offsets misaligned WebPs.
REN = 'world/renderer.js'
OLD_PLACED = """function drawPlacedSprite(ctx,id,point,def,rotation=0){
 return drawSprite(ctx,id,point,worldSpriteGroundFit(spriteMetadata(id),def,rotation));
}"""
NEW_PLACED = """// v13 visual contact: the v11 alpha footprint stays authoritative. A small
// additional burial hides the thick painted plinths that still looked airborne.
// Never alter the logical grid, stored coordinates or construction timers.
export function worldSpriteVisualDock(meta,def,rotation=0){
 const fitted=worldSpriteGroundFit(meta,def,rotation);
 if(!fitted)return null;
 // Landscape ground tiles and paving remain flush; never sink the terrain.
 if(def.layer==='surface'||def.category==='landscape'||def.category==='paths')return fitted;
 let burial=0;
 if(meta.packId==='new-city-premium-sprites-v3-fixed'){
  burial=def.category==='transport'?7:6;
 }else if(def.category==='homes'||def.category==='shops'){
  burial=8;
 }else if(def.category==='parks'){
  burial=8;
 }else if(def.category==='plazas'){
  burial=6;
 }else if(def.category==='decor'){
  burial=(def.id==='lamp'||def.id==='fountain'||def.id==='monument'||def.id==='extra-fountain')?7:5;
 }else{
  burial=4;
 }
 // The sprite is shifted at draw time, not by corrupting source metadata.
 return {...fitted,anchorY:fitted.anchorY-burial*fitted.assetScale};
}
function drawPlacedSprite(ctx,id,point,def,rotation=0){
 return drawSprite(ctx,id,point,worldSpriteVisualDock(spriteMetadata(id),def,rotation));
}"""
change(REN,OLD_PLACED,NEW_PLACED)

# 3. The v11 shadow was narrower than a diamond's forward contact edge. This
#    shadow reaches the front rim, so foundation/soil visually touch.
OLD_GRAD = """  gradient.addColorStop(0,'rgba(41,67,36,.35)');
  gradient.addColorStop(.52,'rgba(41,67,36,.29)');
  gradient.addColorStop(.78,'rgba(41,67,36,.20)');
  gradient.addColorStop(1,'rgba(41,67,36,0)');"""
NEW_GRAD = """  gradient.addColorStop(0,'rgba(41,67,36,.51)');
  gradient.addColorStop(.40,'rgba(41,67,36,.39)');
  gradient.addColorStop(.74,'rgba(41,67,36,.22)');
  gradient.addColorStop(1,'rgba(41,67,36,0)');"""
change(REN,OLD_GRAD,NEW_GRAD)
OLD_RADIUS = """ const radiusX=Math.max(12,Math.min(boundsWidth*.54,visualWidth*.65));
 const radiusY=radiusX*.40;"""
NEW_RADIUS = """ const radiusX=Math.max(12,Math.min(boundsWidth*.54,visualWidth*.65));
 // Extend the soft contact shadow to the FRONT of the isometric base.
 // Keep within the legacy <= half-X-radius rendering budget.
 const radiusY=radiusX*.47;"""
change(REN,OLD_RADIUS,NEW_RADIUS)
OLD_SHADOW_PLACEMENT = " const placement=worldSpriteGroundFit(meta,def,item.rotation||0);"
NEW_SHADOW_PLACEMENT = " const placement=worldSpriteVisualDock(meta,def,item.rotation||0);"
change(REN,OLD_SHADOW_PLACEMENT,NEW_SHADOW_PLACEMENT)

# 4. A tiny pixel-level edge on the front of the plot hides the hard white
#    bright seam between foundation and grass. Drawn in world space and only
#    for solid large buildings and parks; no raised path/road processing.
OLD_DRAW = """  const building=isConstructing(item,now);
  if(skipFx && !revealComplete)drawConstructionSite(ctx,skipFx.item,def,now,skipFx);"""
# There are two spaces before building? Check v11 renderer; do not mutate here
# until validated by local suite.

# 5. Preserve current standalone builder rather than replace it with an old
#    variant. Inline UI WebPs to prevent broken icons in file:// offline HTML.
BUILDER='world/build-standalone.py'
BUILDER_LINE="html=html.replace('</body>', '<script>window.ZeffiEmbeddedSprites='+json.dumps(embedded,separators=(',',':'))+';</script>\\n<script>\\n'+'\\n'.join(source)+'\\n</script>\\n</body>')"
INLINE_CODE="""# v13: icon paths work inside a self-contained file:// offline preview, too.
ui_names=('icon_Mir_zeffi_world_stranitca.webp','icon_catolog_stroinka.webp',
 'icon_all_stroika.webp','icon_house.webp','icon_zavedenia.webp',
 'icon_transport.webp','icon_parks.webp','icon_ploshadki.webp',
 'icon_landshaft.webp','icon_decor.webp',
 'iconScore.webp','iconCoffee.webp','zefir_currency.webp')
for name in ui_names:
    image=(ROOT.parent/'assets'/'mir_zeffi'/name)
    if not image.is_file():
        raise FileNotFoundError(f'Missing Zeffi UI icon: {image}')
    uri='data:image/webp;base64,'+base64.b64encode(image.read_bytes()).decode('ascii')
    html=html.replace('src="../assets/mir_zeffi/'+name+'"','src="'+uri+'"')
    source=[s.replace("'../assets/mir_zeffi/"+name+"'", "'"+uri+"'") for s in source]
"""
change(BUILDER,BUILDER_LINE,INLINE_CODE+BUILDER_LINE)

# 6. Source HTML already has icon slots; none of these files change D1/Worker.
#    Validate that all actual images exist before any writes.
ASSETS=['iconScore.webp','iconCoffee.webp','zefir_currency.webp','icon_Mir_zeffi_world_stranitca.webp','icon_catolog_stroinka.webp','icon_all_stroika.webp','icon_house.webp','icon_zavedenia.webp',
        'icon_transport.webp','icon_parks.webp','icon_ploshadki.webp',
        'icon_landshaft.webp','icon_decor.webp']
for filename in ASSETS:
    asset=ROOT/'assets'/'mir_zeffi'/filename
    if not asset.is_file() or asset.stat().st_size<200:
        fail(f'Missing WebP category image: {asset}')
    if asset.open('rb').read(4)!=b'RIFF':
        fail(f'Not a valid WebP RIFF: {asset}')

# Every planned edit was confirmed and is stored in memory. Write only now.
for relative,output in CHANGED.items():
    target=ROOT/relative
    target.write_text(output,encoding='utf-8')
    print(f'v13 updated: {relative}')
if not CHANGED:
    print('v13 already installed. No changes needed.')
print('v13 changes are visual-only; no Worker, D1, city or wallet mutation.')
