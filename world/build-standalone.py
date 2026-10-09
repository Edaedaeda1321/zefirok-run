"""Bundle v0.1.4 sandbox and active WebP-only assets in one offline HTML."""
from pathlib import Path
import re, json, base64
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'world.css').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./world.css" />','<style>\n'+css+'\n</style>')
html=html.replace('<script type="module" src="./app.js"></script>','')
source=[]
for filename in ('economy.js','catalog.js','ru.js','engine.js','sprite-manifest.js','sprite-assets.js','renderer.js','app.js'):
    s=(ROOT/filename).read_text(encoding='utf-8')
    s=re.sub(r"^import\s+(?:[\s\S]*?)\s+from\s+['\"][^'\"]+['\"];\s*",'',s,flags=re.M)
    s=re.sub(r'^export\s+', '', s, flags=re.M)
    source.append(s)
manifest=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))
embedded={}
for asset in manifest['assets']:
    content=(ROOT/asset['fileWebp']).read_bytes()
    embedded[asset['id']]='data:image/webp;base64,'+base64.b64encode(content).decode('ascii')
html=html.replace('</body>', '<script>window.ZeffiEmbeddedSprites='+json.dumps(embedded,separators=(',',':'))+';</script>\n<script>\n'+'\n'.join(source)+'\n</script>\n</body>')
output=ROOT.parent/'world-v01-preview.html'
output.write_text(html,encoding='utf-8')
print('Standalone offline preview:',output,'bytes:',output.stat().st_size,'embedded WebP:',len(embedded))
