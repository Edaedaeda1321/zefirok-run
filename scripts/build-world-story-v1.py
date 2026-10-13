#!/usr/bin/env python3
"""Build one offline HTML from the exact story-world modules and selected WebP assets.
Build: Python 3 + Node 22. Run the resulting HTML: any modern browser, no server.
No eval, remote requests, third-party bundler, production credentials or save imports.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import posixpath
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(r"^import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"];?\s*", re.M)
EXPORT = re.compile(r"\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)")

def build(output: Path) -> None:
    result = subprocess.run(['node', '--input-type=module', '-e', "import {requiredStorySpriteIds} from './world/story/view.js'; import {spriteManifest} from './world/sprite-assets.js'; console.log(JSON.stringify({ids:requiredStorySpriteIds(),manifest:spriteManifest}));"], cwd=ROOT, check=True, text=True, capture_output=True)
    info = json.loads(result.stdout)
    ids = info['ids']
    manifest = info['manifest']
    manifest['assets'] = [asset for asset in manifest['assets'] if asset['id'] in ids]
    by_id = {asset['id']: asset for asset in manifest['assets']}
    sprites = {}
    for key in ids:
        asset = ROOT / 'world' / by_id[key]['fileWebp']
        sprites[key] = 'data:image/webp;base64,' + base64.b64encode(asset.read_bytes()).decode('ascii')
    compiled, visiting, names = [], set(), set()
    def compile_module(name: str) -> None:
        if name in names:
            return
        if name in visiting:
            raise ValueError('Circular dependency: ' + name)
        if not name.startswith('world/') or '..' in Path(name).parts:
            raise ValueError('Unexpected module path: ' + name)
        visiting.add(name)
        source = (ROOT / name).read_text(encoding='utf-8')
        if name == 'world/sprite-manifest.js':
            source = 'export const SPRITE_MANIFEST = ' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n'
        def replace_import(match: re.Match) -> str:
            dep = posixpath.normpath(posixpath.join(posixpath.dirname(name), match.group(2)))
            compile_module(dep)
            bindings = re.sub(r'\s+as\s+', ': ', match.group(1))
            return 'const {' + bindings + '} = M[' + json.dumps(dep) + '];\n'
        source = IMPORT.sub(replace_import, source)
        exported = EXPORT.findall(source)
        def remove_export_list(match: re.Match) -> str:
            for item in match.group(1).split(','):
                item = item.strip()
                if item:
                    if not re.fullmatch(r'\w+', item):
                        raise ValueError('Unsupported export: ' + item)
                    exported.append(item)
            return ''
        source = re.sub(r'\bexport\s*\{([^}]+)\};?', remove_export_list, source)
        source = re.sub(r'\bexport\s+(?=(?:async\s+)?(?:function|class|const|let|var)\s)', '', source)
        if re.search(r'^\s*(?:import|export)\s|\bimport\(', source, re.M):
            raise ValueError('Unsupported import/export in ' + name)
        compiled.append('M[' + json.dumps(name) + '] = (() => {\n' + source + '\nreturn {' + ','.join(dict.fromkeys(exported)) + '};\n})();')
        visiting.remove(name)
        names.add(name)
    compile_module('world/story/app.js')
    html = (ROOT / 'story-world.html').read_text(encoding='utf-8')
    html = re.sub(r'\s*<base\b[^>]*>', '', html)
    css = (ROOT / 'world/story/style.css').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet"[^>]*>', lambda _: '<style>' + css + '</style>', html)
    html = re.sub(r'<script type="module" src="\./story/boot\.js\?v=[^"]+"></script>', '', html)
    if 'boot.js' in html:
        raise ValueError('Hosted auth loader must not be included in offline build')
    brand = ROOT / 'assets/mir_zeffi/icon_Mir_zeffi_world_stranitca.webp'
    html = html.replace('../assets/mir_zeffi/icon_Mir_zeffi_world_stranitca.webp', 'data:image/webp;base64,' + base64.b64encode(brand.read_bytes()).decode('ascii'))
    html = html.replace('href="../world.html?world_tester=1"', 'href="#"')
    html = re.sub(r'<title>.*?</title>', '<title>Мир Зеффи — общий город · автономный v1.3</title>', html)
    program = "(() => {\n'use strict';\nconst M=Object.create(null);\nwindow.ZeffiEmbeddedSprites=" + json.dumps(sprites, separators=(',', ':')) + ';\n' + '\n'.join(compiled)
    atlas = ROOT / 'world/assets/transport-v3/bus-rose-atlas.webp'
    program += '\nwindow.ZeffiEmbeddedBusAtlas=' + json.dumps('data:image/webp;base64,'+base64.b64encode(atlas.read_bytes()).decode('ascii')) + ';\n'
    program += "\nM['world/story/app.js'].startStoryWorld({mode:'standalone'}).catch(error=>{console.error(error);document.getElementById('accessGate').hidden=false;document.getElementById('accessMessage').textContent='Не удалось загрузить автономный мир: '+error.message;const retry=document.getElementById('accessRetry');if(retry){retry.hidden=false;retry.onclick=()=>location.reload();}});\n})();"
    if '</script' in program.lower():
        raise ValueError('Unsafe inline script closing tag')
    html = html.replace('</body>', '<script>\n' + program + '\n</script>\n</body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(json.dumps({'output':str(output),'bytes':output.stat().st_size,'sprites':len(sprites),'modules':len(names),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.story-standalone-output/START_STORY_WORLD.html')
    args = parser.parse_args()
    build(args.output.resolve())