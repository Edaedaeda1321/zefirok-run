#!/usr/bin/env python3
"""Install Zeffi World transport 3D + asphalt lane refresh.
Usage:
  python3 scripts/apply-world-transport-3d-asphalt-v1.py --check
  python3 scripts/apply-world-transport-3d-asphalt-v1.py
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, sys, tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
PAYLOAD=HERE/'.world-transport-3d-asphalt-v1'
VERSION='world-transport-3d-asphalt-1.0.0'
class Conflict(RuntimeError):
    pass

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def safe_path(root: Path, rel: str) -> Path:
    parts=Path(rel)
    if parts.is_absolute() or '..' in parts.parts or not parts.parts:
        raise Conflict('Unsafe path: '+rel)
    dest=root/parts
    cursor=root
    for part in parts.parts:
        cursor=cursor/part
        if cursor.is_symlink():
            raise Conflict('Symlink not allowed: '+rel)
    parent = dest.parent.resolve() if dest.parent.exists() else dest.parent
    if os.path.commonpath((str(root), str(parent))) != str(root):
        raise Conflict('Path escapes root: '+rel)
    return dest

def load_manifest():
    data=json.loads((PAYLOAD/'manifest.json').read_text(encoding='utf-8'))
    if data.get('version') != VERSION:
        raise Conflict('Unexpected patch version')
    return data

def plan(root: Path):
    if not (root/'world.html').is_file():
        raise Conflict('Run from the project root, next to world.html.')
    manifest=load_manifest(); actions=[]; edits={}
    for rel, info in manifest['targets'].items():
        target=safe_path(root, rel)
        payload=safe_path(PAYLOAD, info['payload'])
        if not target.is_file():
            raise Conflict('Missing target file: '+rel)
        current=target.read_bytes(); current_sha=digest(current)
        replacement=payload.read_bytes(); replacement_sha=digest(replacement)
        if replacement_sha != info['replacement_sha256']:
            raise Conflict('Payload integrity error: '+rel)
        if current_sha == replacement_sha:
            actions.append(('ALREADY',rel)); continue
        if current_sha != info['expected_sha256']:
            raise Conflict('Current file differs from the tested main for '+rel+'. Refusing to overwrite unknown changes.')
        edits[rel]=(current,replacement); actions.append(('UPDATE',rel))
    return actions, edits

def apply(root: Path, edits: dict):
    if not edits: return None
    backup_root=root/'.world-transport-3d-asphalt-backup'
    if backup_root.is_symlink(): raise Conflict('Backup directory cannot be a symlink')
    backup_root.mkdir(exist_ok=True)
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path(tempfile.mkdtemp(prefix=stamp+'-',dir=backup_root))
    receipt={'version':VERSION,'files':[]}
    completed=[]
    try:
        for rel,(old,new) in edits.items():
            target=safe_path(root,rel)
            copy=backup/'before'/rel
            copy.parent.mkdir(parents=True,exist_ok=True)
            copy.write_bytes(old)
            target.write_bytes(new)
            completed.append((rel,old))
            receipt['files'].append({'path':rel,'before_sha256':digest(old),'after_sha256':digest(new)})
    except OSError as exc:
        failed=[]
        for rel,old in reversed(completed):
            try: safe_path(root,rel).write_bytes(old)
            except OSError as error: failed.append(rel+': '+str(error))
        raise Conflict('Install failed: '+str(exc)+('; manual recovery may be needed for '+', '.join(failed) if failed else '')) from exc
    (backup/'receipt.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False),encoding='utf-8')
    return backup

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read-only compatibility check')
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args=parser.parse_args(); root=args.root.expanduser().resolve()
    try:
        actions, edits=plan(root)
        for action, rel in actions: print(f'{action:7} {rel}')
        print(f'Preflight PASSED: {len(edits)} change(s).')
        if args.check:
            print('Dry run: no files changed.')
            return 0
        backup=apply(root,edits)
        if backup: print('Backup: '+str(backup))
        print('Transport 3D + asphalt refresh installed.')
        print('Next suggested checks:')
        print('  node --check world/traffic.js')
        print('  node --check world/renderer.js')
        print('  node --check world/story/map.js')
        print('  node --test world/tests/city-life.test.mjs world/tests/story-world-v1.test.mjs world/tests/story-access-v1.test.mjs')
        return 0
    except (Conflict, OSError, ValueError, KeyError, UnicodeError) as error:
        print('ERROR: '+str(error), file=sys.stderr)
        print('STOP. Do not overwrite unknown local files with this patch.', file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
