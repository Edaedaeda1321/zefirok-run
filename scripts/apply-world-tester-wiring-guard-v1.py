#!/usr/bin/env python3
"""Minimal, guarded fix for legacy Zeffi World production-wiring regression test."""
from __future__ import annotations
import argparse
import base64
import datetime
import hashlib
import os
from pathlib import Path
import stat
import sys
import tempfile
import zlib

BEFORE_SHA = '581d21d3b96634d50491de6380946ecbdb6f22e3c049159e3b882a7002d5cc8d'
AFTER_SHA = '7bd31b3092e88d019b1b5885b26f6ba525949ef617a4e81269c8b9d21c7eb1b0'
PAYLOAD_ZLIB_B64 = (
    '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'
    'J6OWyJir9kqnm41qJ1M2av8D1gk9sg=='
)
TARGET = Path('scripts/check-world-api-wiring.mjs')
BACKUP = Path('.world-story-tester-entry-v1-backup')

class UnsafeInstall(RuntimeError):
    pass

def checksum(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()

def locate_project(path: Path):
    root=path.resolve()
    if not all((root/name).is_file() for name in ('index.html','story-world.html','world.html')):
        raise UnsafeInstall('Start from the zefirok-run project root.')
    target=root/TARGET
    if target.is_symlink() or not target.is_file() or target.parent.is_symlink():
        raise UnsafeInstall('Expected a regular scripts/check-world-api-wiring.mjs; symlinks are forbidden.')
    # The previous tester-entry patch must actually be present before we
    # update a guard that depends on its new signed story-access contract.
    runner=(root/'index.html').read_text(encoding='utf-8')
    story=(root/'story-world.html').read_text(encoding='utf-8')
    if "fetch('/api/world/story-access'" not in runner or './story/boot.js?v=2' not in story:
        raise UnsafeInstall('Tester-only Story World entry v1 is not installed. Refusing standalone guard changes.')
    return root,target

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Only verify local file integrity; do not write.')
    parser.add_argument('--root',type=Path,default=Path.cwd())
    args=parser.parse_args()
    try:
        root,target=locate_project(args.root)
        prior=target.read_bytes()
        digest=checksum(prior)
        candidate=zlib.decompress(base64.b64decode(PAYLOAD_ZLIB_B64))
        if checksum(candidate)!=AFTER_SHA:
            raise UnsafeInstall('Installer payload integrity failure.')
        if digest==AFTER_SHA:
            print('ALREADY  scripts/check-world-api-wiring.mjs (no changes required)')
            return 0
        if digest!=BEFORE_SHA:
            raise UnsafeInstall('Unknown or modified check-world-api-wiring.mjs (SHA-256='+digest+'). No files changed.')
        print('UPDATE   scripts/check-world-api-wiring.mjs')
        print('Preflight PASSED. Only the outdated production wiring check will be updated.')
        if args.check:
            print('DRY RUN: no files changed.')
            return 0
        backups=root/BACKUP
        if backups.is_symlink():
            raise UnsafeInstall('Unsafe backup location (symlink).')
        backups.mkdir(exist_ok=True)
        backup=Path(tempfile.mkdtemp(prefix='world-wiring-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-',dir=backups))
        copy=backup/'check-world-api-wiring.mjs.before'
        copy.write_bytes(prior)
        if checksum(copy.read_bytes()) != BEFORE_SHA:
            raise UnsafeInstall('Backup verification failed, no file changed.')
        fd,tmp=tempfile.mkstemp(prefix='.world-wiring-',dir=target.parent)
        try:
            with os.fdopen(fd,'wb') as stream:
                stream.write(candidate)
                stream.flush()
                os.fsync(stream.fileno())
            os.chmod(tmp,stat.S_IMODE(target.stat().st_mode))
            if target.read_bytes()!=prior:
                raise UnsafeInstall('Concurrent change detected; no file changed.')
            os.replace(tmp,target)
            if checksum(target.read_bytes())!=AFTER_SHA:
                # A one-file atomic install; if verification fails, rollback.
                rollback=target.with_suffix('.mjs.rollback-tmp')
                try:
                    rollback.write_bytes(prior)
                    os.replace(rollback,target)
                finally:
                    rollback.unlink(missing_ok=True)
                raise UnsafeInstall('Post-write checksum failed; rolled back.')
        finally:
            try:os.unlink(tmp)
            except FileNotFoundError:pass
        print('INSTALLED. Backup:',backup)
        print('Next: node scripts/check-world-api-wiring.mjs')
        print('Then: node scripts/check-production-gate.mjs')
        return 0
    except (UnsafeInstall,OSError,UnicodeError,ValueError,zlib.error) as exc:
        print('STOP:',exc,file=sys.stderr)
        return 1

if __name__=='__main__':
    raise SystemExit(main())
