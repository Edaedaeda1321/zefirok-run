"""Bundle v0.1.4 sandbox and active WebP-only assets in one offline HTML."""
from pathlib import Path
import re, json, base64
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'world.css').read_text(encoding='utf-8')+'\n'+(ROOT/'premium-ui.css').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./world.css" />','<style>\n'+css+'\n</style>')
html=html.replace('<link rel="stylesheet" href="./premium-ui.css" />','')
html=html.replace('<script type="module" src="./app.js"></script>','')
# Currency images are embedded only in the offline preview. In the real app the
# same original images are loaded from /assets and browser-cached normally.
for resource in ('assets/optimized/v0.79.5/iconScore.webp',
                 'assets/optimized/v0.79.5/iconCoffee.webp',
                 'assets/season-pass/zefir_currency.webp'):
    png=(ROOT.parent/resource).read_bytes()
    html=html.replace('src="../'+resource+'"', 'src="data:image/webp;base64,'+base64.b64encode(png).decode('ascii')+'"')
source=[]
for filename in ('economy.js','catalog.js','ru.js','engine.js','sprite-manifest.js','sprite-assets.js','citizens.js','renderer.js','app.js'):
    s=(ROOT/filename).read_text(encoding='utf-8')
    if filename=='engine.js':
        s=s.replace('points: 18000, coffee: 400, treats: 300','points: 800000, coffee: 6000, treats: 12000',1) # offline-only test credit
    s=re.sub(r"^import\s+(?:[\s\S]*?)\s+from\s+['\"][^'\"]+['\"];\s*",'',s,flags=re.M)
    s=re.sub(r'^export\s+', '', s, flags=re.M)
    if filename=='citizens.js':
        # Avoid same-named module-private hash() from renderer.js in the inline bundle.
        s=re.sub(r'\bhash\(', 'citizenHash(', s)
    if filename=='app.js':
        # Reuse the exact same WebP as the season pass. Offline HTML must inline
        # it so the lock also works over file:// without network access.
        lock_path=ROOT.parent/'assets/ui/icon_closed.webp'
        lock_token="'../assets/ui/icon_closed.webp'"
        if s.count(lock_token)!=1:
            raise ValueError('Expected one shop lock icon reference in app.js')
        s=s.replace(lock_token,"'data:image/webp;base64,"+base64.b64encode(lock_path.read_bytes()).decode('ascii')+"'")
        # Offline proof avoids blocking on upfront decode of 100+ embedded images;
        # real web entries retain full fail-safe sprite preload.
        s=s.replace('}else void bootLocalArt();', '}else {state.visualsReady=true;refreshArt();}')
        for resource in ('assets/optimized/v0.79.5/iconScore.webp',
                         'assets/optimized/v0.79.5/iconCoffee.webp',
                         'assets/season-pass/zefir_currency.webp'):
            content=(ROOT.parent/resource).read_bytes()
            s=s.replace("'../"+resource+"'", "'data:image/webp;base64,"+base64.b64encode(content).decode('ascii')+"'")
    source.append(s)
manifest=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))
embedded={}
for asset in manifest['assets']:
    content=(ROOT/asset['fileWebp']).read_bytes()
    embedded[asset['id']]='data:image/webp;base64,'+base64.b64encode(content).decode('ascii')
# v13: icon paths work inside a self-contained file:// offline preview, too.
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
html=html.replace('</body>', '<script>window.ZeffiEmbeddedSprites='+json.dumps(embedded,separators=(',',':'))+';</script>\n<script>\n'+'\n'.join(source)+'\n</script>\n</body>')
output=ROOT.parent/'world-v01-preview.html'
output.write_text(html,encoding='utf-8')
print('Standalone offline preview:',output,'bytes:',output.stat().st_size,'embedded WebP:',len(embedded))
