#!/usr/bin/env python3
"""Optional art-authoring tool; NOT required at deploy time.

Regenerate measured non-transparent image bounds whenever a WebP sprite changes.
Requires Pillow: python3 -m pip install Pillow
The game and its Worker do not import this script or decode sprite pixels.
"""
from pathlib import Path
import json

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit('Pillow is needed only when regenerating sprite metadata: pip install Pillow') from exc

root = Path(__file__).resolve().parent.parent / 'world'
manifest_path = root / 'assets' / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
updated = 0
for sprite in manifest['assets']:
    if sprite.get('category') in ('roads', 'ground', 'landscape', 'paths'):
        sprite.pop('groundAlphaBounds', None)
        continue
    source = root / sprite['fileWebp']
    if not source.is_file():
        raise SystemExit(f'Image is missing: {source}')
    alpha = Image.open(source).convert('RGBA').getchannel('A')
    bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
    if not bounds:
        raise SystemExit(f'No visible pixels: {source}')
    sprite['groundAlphaBounds'] = list(bounds)
    updated += 1
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'sprite-manifest.js').write_text(
    'export const SPRITE_MANIFEST = ' +
    json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n',
    encoding='utf-8')
print(f'Updated {updated} alpha-ground bounds; original WebP files unchanged.')
