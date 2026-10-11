#!/usr/bin/env python3
"""Safe, repeatable in-repository installer for Mir Zeffi City Life v1.

Usage from the repository root:
    python3 scripts/apply-world-city-life-v1.py --check
    python3 scripts/apply-world-city-life-v1.py

Source files are modified only after every compatibility/integrity check passes.
Existing unrelated app.js / renderer.js / release-gate edits are preserved.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAYLOAD = HERE / '.world-city-life-v1'


class Conflict(RuntimeError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def ensure_safe(root: Path, rel: str) -> Path:
    name = Path(rel)
    if name.is_absolute() or '..' in name.parts or not name.parts:
        raise Conflict('Unsafe patch destination: ' + rel)
    target = root / name
    if os.path.commonpath((str(root), str(target.parent.resolve()))) != str(root):
        raise Conflict('Destination escapes repository: ' + rel)
    if target.is_symlink():
        raise Conflict('Refusing to modify symlink: ' + rel)
    if target.exists() and not target.is_file():
        raise Conflict('Not an ordinary file: ' + rel)
    return target


def plan(root: Path):
    manifest_path = PAYLOAD / 'manifest.json'
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise Conflict('Missing install manifest; unzip the whole archive into the project root')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('version') != '1.0.0-autoinstall':
        raise Conflict('Unexpected installer manifest version')
    if not (root / 'world.html').is_file() or not (root / 'world/engine.js').is_file():
        raise Conflict('Wrong working folder. Run from zefirok-run root (world.html, world/engine.js)')

    edits = {}
    status = []
    strict = manifest['strict_old_sha256']
    for rel, expect in manifest['payloads'].items():
        dst = ensure_safe(root, rel)
        source = PAYLOAD / rel
        if source.is_symlink() or not source.is_file():
            raise Conflict('Missing or linked patch payload: ' + rel)
        new = source.read_bytes()
        if sha256(new) != expect:
            raise Conflict('Patch payload integrity check failed: ' + rel)
        old = dst.read_bytes() if dst.exists() else None
        if old is not None and old == new:
            status.append(('ALREADY', rel))
            continue
        if rel in strict:
            if old is None or sha256(old) != strict[rel]:
                raise Conflict(f'{rel}: changed since baseline; refusing to erase existing NPC logic')
        elif old is not None:
            raise Conflict(f'{rel}: existing file is different; refusing to overwrite it')
        edits[rel] = (old, new)
        status.append(('UPDATE' if old is not None else 'CREATE', rel))

    for rel, operations in manifest['transforms'].items():
        dst = ensure_safe(root, rel)
        if not dst.is_file():
            raise Conflict('Required project file is missing: ' + rel)
        old = dst.read_bytes()
        try:
            text = old.decode('utf-8')
        except UnicodeDecodeError as exc:
            raise Conflict(f'{rel}: UTF-8 decode failed: {exc}') from exc
        updates = 0
        for operation in operations:
            before, after = operation['before'], operation['after']
            if text.count(after) == 1:
                continue
            if text.count(before) != 1:
                raise Conflict(f'{rel}: incompatible anchor ({operation["label"]}). No files modified.')
            text = text.replace(before, after, 1)
            updates += 1
        # Reject partial rewrites of the new hooks instead of adding a
        # second import/scene/check beside a custom version.
        must_appear_once = {
            'world/app.js': (
                "from './traffic.js';", 'trafficScene: null',
                'buses:sampleBusScene(state.trafficScene,now)',
                'state.trafficScene=buildBusScene(state.city,CATALOG,Date.now());',
            ),
            'world/renderer.js': (
                "from './traffic.js';", 'drawBus(ctx,layer.bus',
                'for(const bus of overlay.buses||[])',
            ),
            'scripts/check-production-gate.mjs': (
                "'Zeffi World city life and buses'",
            ),
            'scripts/check-world-integration.mjs': (
                "'traffic.js'",
            ),
        }
        for expected in must_appear_once.get(rel, ()):
            if text.count(expected) != 1:
                raise Conflict(f'{rel}: ambiguous or duplicate integration for {expected!r}; no changes made')
        new = text.encode('utf-8')
        if updates:
            edits[rel] = (old, new)
            status.append(('UPDATE', f'{rel} ({updates} targeted edits)'))
        else:
            status.append(('ALREADY', rel))
    return status, edits


def apply(root: Path, edits: dict):
    # Preflight has already evaluated ALL affected files and payload hashes.
    # Replace with same-filesystem staged files; rollback every completed write
    # if any later replacement fails.
    completed = []
    with tempfile.TemporaryDirectory(prefix='.zeffi-city-life-stage-', dir=str(root)) as temp:
        stage = Path(temp)
        for rel, (old, new) in edits.items():
            target = root / rel
            new_path = stage / 'new' / rel
            new_path.parent.mkdir(parents=True, exist_ok=True)
            new_path.write_bytes(new)
            if old is not None:
                os.chmod(new_path, target.stat().st_mode & 0o777)
                backup = stage / 'old' / rel
                backup.parent.mkdir(parents=True, exist_ok=True)
                backup.write_bytes(old)
                os.chmod(backup, target.stat().st_mode & 0o777)
        try:
            for rel, (old, _) in edits.items():
                target = root / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                os.replace(stage / 'new' / rel, target)
                completed.append((rel, old))
        except OSError as exc:
            rollback_errors = []
            for rel, old in reversed(completed):
                try:
                    target = root / rel
                    if old is None:
                        target.unlink(missing_ok=True)
                    else:
                        os.replace(stage / 'old' / rel, target)
                except OSError as back_exc:
                    rollback_errors.append(f'{rel}: {back_exc}')
            message = f'Installation failed: {exc}; rollback attempted.'
            if rollback_errors:
                message += ' MANUAL RECOVERY REQUIRED: ' + '; '.join(rollback_errors)
            raise Conflict(message) from exc


def main():
    parser = argparse.ArgumentParser(description='Install World Zeffi living city, preserving unrelated current main changes')
    choices = parser.add_mutually_exclusive_group()
    choices.add_argument('--check', action='store_true', help='Dry run; do not modify project files')
    choices.add_argument('--apply', action='store_true', help='Apply patch (same as no flag)')
    parser.add_argument('--root', type=Path, default=Path.cwd(), help='Project root (defaults to current directory)')
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    try:
        statuses, updates = plan(root)
        for action, filename in statuses:
            print(f'{action:7} {filename}')
        print(f'Preflight PASSED: {len(statuses)} files; {len(updates)} change(s).')
        if args.check:
            print('Dry run only; repository files were not changed.')
            return 0
        if updates:
            apply(root, updates)
        print('City Life v1 installed successfully (or already installed).')
        print('Next: node scripts/check-world-city-life-v1.mjs')
        return 0
    except (Conflict, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        print('Installation aborted. Do not force-copy older world/*.js over current main.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
