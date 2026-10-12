#!/usr/bin/env python3
"""Verified, reversible Zeffi World dual-tester + Belkino patch.

Usage: python3 scripts/apply-zeffi-dual-belkino-v1.py --check [--root path]
       python3 scripts/apply-zeffi-dual-belkino-v1.py [--root path]
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

VERSION='zeffi-dual-belkino-mobile-v1.0.0'
PAYLOAD_REL='.world-story-v1-backup/.zeffi-dual-v1-payload'

class Conflict(RuntimeError): pass

def digest(blob): return hashlib.sha256(blob).hexdigest()

def safe_target(root, relative):
    p=Path(relative)
    if not relative or p.is_absolute() or '..' in p.parts:
        raise Conflict('Unsafe path: '+str(relative))
    dest=root/p
    cursor=root
    for section in p.parts:
        cursor=cursor/section
        if cursor.is_symlink(): raise Conflict('Symlink forbidden: '+relative)
    return dest

def load(root):
    if not (root/'index.html').is_file() or not (root/'story-world.html').is_file():
        raise Conflict('Run from root of zefirok-run project.')
    payload=root/PAYLOAD_REL
    if not payload.is_dir() or payload.is_symlink(): raise Conflict('Patch payload not found in ignored directory.')
    manifest=json.loads((payload/'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('version')!=VERSION:raise Conflict('Wrong patch version')
    edits={};states=[]
    for rel,entry in manifest['targets'].items():
        target=safe_target(root,rel)
        source=safe_target(payload,entry['payload'])
        if not source.is_file():raise Conflict('Missing payload '+rel)
        replacement=source.read_bytes()
        if digest(replacement)!=entry['sha256']:raise Conflict('Payload hash mismatch '+rel)
        exists=target.exists()
        if exists and not target.is_file():raise Conflict('Target is not a file '+rel)
        old=target.read_bytes() if exists else None
        if old is not None and digest(old)==entry['sha256']:
            states.append(('ALREADY',rel));continue
        if entry['action']=='create' and old is not None:raise Conflict('Unexpected existing file '+rel)
        if entry['action']=='replace' and (old is None or digest(old) not in entry.get('before_sha256',[])):
            raise Conflict('Unknown version of '+rel+' (possibly unsaved edits); refusing to overwrite.')
        edits[rel]=(old,replacement);states.append(('CREATE' if old is None else 'UPDATE',rel))
    return states,edits

def atomic_write(target,content):
    target.parent.mkdir(parents=True,exist_ok=True)
    fd,temp=tempfile.mkstemp(prefix='.zeffi-dual-',dir=target.parent)
    try:
        if target.is_file():os.chmod(temp,target.stat().st_mode & 0o777)
        with os.fdopen(fd,'wb') as file: file.write(content);file.flush();os.fsync(file.fileno())
        os.replace(temp,target)
    finally:
        if os.path.exists(temp):os.unlink(temp)

def apply(root,edits):
    if not edits:return None
    backups=root/'.world-story-v1-backup'
    if backups.is_symlink():raise Conflict('Backup directory is symlink')
    backups.mkdir(exist_ok=True)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path(tempfile.mkdtemp(prefix='dual-v1-'+stamp+'-',dir=backups))
    before=backup/'before';receipt=[]
    for rel,(old,new) in edits.items():
        if old is not None:
            dest=safe_target(before,rel)
            dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(old)
        receipt.append({'path':rel,'before':digest(old) if old is not None else None,'after':digest(new)})
    (backup/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
    updated=[]
    try:
        for rel,(old,new) in edits.items():
            target=safe_target(root,rel)
            atomic_write(target,new);updated.append(rel)
    except OSError as error:
        failures=[]
        for rel in reversed(updated):
            old=edits[rel][0];dest=safe_target(root,rel)
            try:
                if old is None:dest.unlink(missing_ok=True)
                else:atomic_write(dest,old)
            except OSError as undo:failures.append(rel+': '+str(undo))
        raise Conflict('Install failed; reverted changes.'+('; manual restore from '+str(backup)+': '+', '.join(failures) if failures else '')) from error
    return backup

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check',action='store_true',help='Dry run, do not touch project')
    p.add_argument('--root',type=Path,default=Path.cwd())
    args=p.parse_args();root=args.root.expanduser().resolve()
    try:
        states,edits=load(root)
        for status,rel in states:print('%-7s %s'%(status,rel))
        print('Compatibility: PASS; %d updates / %d targets.'%(len(edits),len(states)))
        if args.check:
            print('DRY RUN: nothing changed.');return 0
        backup=apply(root,edits)
        if backup:print('Backup:',backup)
        print('Installed. Run node scripts/check-world-dual-v1.mjs and the production gate.')
        return 0
    except (Conflict,OSError,ValueError,KeyError) as error:
        print('ERROR:',error,file=sys.stderr)
        print('STOP: patch is not compatible with this working copy. Do not bypass SHA checks.',file=sys.stderr)
        return 1

if __name__=='__main__':raise SystemExit(main())
