#!/usr/bin/env python3
"""Safely install Story World v1 from the repository root.
python3 scripts/apply-world-story-v1.py --check
python3 scripts/apply-world-story-v1.py
All preflight checks complete before any project file is written. No Git or deploy commands run.
"""
from __future__ import annotations
import argparse
import datetime
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAYLOAD = HERE / '.world-story-v1'
class Conflict(RuntimeError):
    pass

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def safe_path(root: Path, rel: str) -> Path:
    parts = Path(rel)
    if parts.is_absolute() or '..' in parts.parts or not parts.parts:
        raise Conflict('Unsafe destination: ' + rel)
    dest = root / parts
    cursor = root
    for part in parts.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise Conflict('Symlink not allowed: ' + rel)
    if os.path.commonpath((str(root), str(dest.parent.resolve()))) != str(root):
        raise Conflict('Path escapes root: ' + rel)
    if dest.exists() and not dest.is_file():
        raise Conflict('Expected a regular file: ' + rel)
    return dest

def plan(root: Path):
    manifest_path = safe_path(PAYLOAD, 'manifest.json')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('version') != 'story-world-1.0.0':
        raise Conflict('Unexpected patch version')
    if not (root / 'world.html').is_file():
        raise Conflict('Run from the project root, next to world.html and update.sh')
    status, edits = [], {}
    for rel, expected in manifest['dependencies'].items():
        dest = safe_path(root, rel)
        if not dest.is_file() or digest(dest.read_bytes()) != expected:
            raise Conflict('Dependency differs from tested main: ' + rel + '. Do not overwrite current files with older ones.')
    for rel, expected in manifest['payloads'].items():
        src, dest = safe_path(PAYLOAD, rel), safe_path(root, rel)
        new = src.read_bytes()
        if digest(new) != expected:
            raise Conflict('Payload integrity error: ' + rel)
        old = dest.read_bytes() if dest.exists() else None
        if old == new:
            status.append(('ALREADY', rel))
        elif old is not None:
            raise Conflict('Existing new module differs; refusing to overwrite: ' + rel)
        else:
            edits[rel] = (old, new)
            status.append(('CREATE', rel))
    for rel, operations in manifest['transforms'].items():
        dest = safe_path(root, rel)
        if not dest.exists():
            raise Conflict('Missing current project file: ' + rel)
        old = dest.read_bytes()
        text = old.decode('utf-8')
        for op in operations:
            if op.get('append'):
                block, marker = op['append'], op['marker']
                if text.count(block) == 1:
                    continue
                if marker in text:
                    raise Conflict('Partially installed block: ' + rel)
                text += block
            else:
                before, after = op['before'], op['after']
                if text.count(after) == 1:
                    continue
                if text.count(before) != 1:
                    raise Conflict('Ambiguous or changed integration anchor: ' + rel)
                text = text.replace(before, after, 1)
        for needle in manifest['unique_hooks'].get(rel, []):
            if text.count(needle) != 1:
                raise Conflict('Duplicate/partial story integration: ' + rel)
        new = text.encode('utf-8')
        if new == old:
            status.append(('ALREADY', rel))
        else:
            edits[rel] = (old, new)
            status.append(('UPDATE', rel))
    return status, edits

def apply(root: Path, edits: dict) -> Path | None:
    if not edits:
        return None
    # Recheck the entire preflight snapshot in case an editor changed a target.
    for rel, (old, _) in edits.items():
        target = safe_path(root, rel)
        current = target.read_bytes() if target.exists() else None
        if current != old:
            raise Conflict('File changed during preflight: ' + rel)
    backup_root = root / '.world-story-v1-backup'
    if backup_root.is_symlink():
        raise Conflict('Backup directory cannot be a symlink')
    backup_root.mkdir(exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-'), dir=backup_root))
    receipt = {'version':'story-world-1.0.0','files':[]}
    completed = []
    with tempfile.TemporaryDirectory(prefix='.stage-',dir=backup) as temporary:
        stage = Path(temporary)
        for rel, (old, new) in edits.items():
            target = safe_path(root, rel)
            mode = target.stat().st_mode & 0o777 if target.exists() else 0o644
            staged = stage / rel
            staged.parent.mkdir(parents=True, exist_ok=True)
            staged.write_bytes(new)
            os.chmod(staged, mode)
            if old is not None:
                copy = backup / 'before' / rel
                copy.parent.mkdir(parents=True, exist_ok=True)
                copy.write_bytes(old)
                os.chmod(copy, mode)
            receipt['files'].append({'path':rel,'created':old is None,'before_sha256':digest(old) if old is not None else None,'after_sha256':digest(new),'mode':mode})
        (backup / 'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
        try:
            for rel, (old, _) in edits.items():
                target = safe_path(root, rel)
                current = target.read_bytes() if target.exists() else None
                if current != old:
                    raise Conflict('File changed while installing: ' + rel)
                target.parent.mkdir(parents=True, exist_ok=True)
                os.replace(stage / rel, target)
                completed.append((rel,old))
        except (OSError, Conflict) as exc:
            failed = []
            for rel, old in reversed(completed):
                try:
                    target = root / rel
                    if old is None:
                        target.unlink(missing_ok=True)
                    else:
                        shutil.copy2(backup / 'before' / rel, target)
                except OSError as error:
                    failed.append(rel + ': ' + str(error))
            raise Conflict('Install failed: ' + str(exc) + '. Applied writes rolled back.' + (' MANUAL RECOVERY: ' + '; '.join(failed) if failed else '')) from exc
    return backup

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--check',action='store_true',help='Read-only compatibility check')
    modes.add_argument('--apply',action='store_true',help='Install (the default)')
    parser.add_argument('--root',type=Path,default=Path.cwd())
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    try:
        status, edits = plan(root)
        for action, rel in status:
            print(f'{action:7} {rel}')
        print(f'Preflight PASSED: {len(edits)} change(s).')
        if args.check:
            print('Dry run: no project files changed.')
            return 0
        backup = apply(root, edits)
        if backup:
            print('Backup: ' + str(backup))
        print('Story World v1 installed (or ALREADY installed).')
        print('Next: node scripts/check-world-story-v1.mjs')
        print('No database migrations, real contributions or production deployment were performed.')
        return 0
    except (Conflict,OSError,ValueError,KeyError,UnicodeError) as error:
        print('ERROR: ' + str(error),file=sys.stderr)
        print('STOP. Do not force-copy old world files. Fix the reported compatibility problem.',file=sys.stderr)
        return 1
if __name__ == '__main__':
    sys.exit(main())