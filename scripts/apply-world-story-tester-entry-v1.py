#!/usr/bin/env python3
"""Safe, idempotent Story World v1 tester-only production entry patch."""
from __future__ import annotations
import argparse,datetime,hashlib,json,os,sys,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
DATA=HERE/'.story-tester-entry-v1'
BACKUP='.world-story-tester-entry-v1-backup'
class InstallError(Exception):pass

def sha(s:bytes)->str:return hashlib.sha256(s).hexdigest()

def checked(root:Path,rel:str)->Path:
    bits=Path(rel)
    if not rel or bits.is_absolute() or '..' in bits.parts:raise InstallError('unsafe relative path '+rel)
    cur=root
    for bit in bits.parts:
        cur=cur/bit
        if cur.is_symlink():raise InstallError('symlink is not allowed for '+rel)
    if os.path.commonpath((str(root),str(cur.parent.resolve())))!=str(root):
        raise InstallError('path escapes project '+rel)
    return cur

def make_plan(root:Path):
    if not (root/'world.html').is_file() or not (root/'index.html').is_file():
        raise InstallError('Run from zefirok-run root next to index.html and world.html.')
    manifest=json.loads((DATA/'manifest.json').read_text(encoding='utf8'))
    if manifest.get('version')!='story-tester-entry-v1':raise InstallError('Unsupported manifest version')
    edits={}
    statuses=[]
    for rel,entry in manifest['files'].items():
        target=checked(root,rel)
        if not target.is_file():raise InstallError('Missing project file: '+rel)
        previous=target.read_bytes();current=sha(previous)
        if entry['mode']=='replace':
            blob=checked(DATA,entry['payload']).read_bytes()
            if sha(blob)!=entry['new_sha256']:raise InstallError('Archive payload checksum failure: '+rel)
            if current==entry['new_sha256']:
                statuses.append(('ALREADY',rel));continue
            if current not in entry['old_sha256']:
                raise InstallError('Unknown file version '+rel+'; no files changed. Preserve local changes and reconcile.')
        elif entry['mode']=='replace_fragment':
            if current in entry['expected_output_sha256'].values():
                statuses.append(('ALREADY',rel));continue
            if current not in entry['old_sha256']:
                raise InstallError('Unknown file version '+rel+'; no files changed. Preserve local changes and reconcile.')
            old=entry['fragment_old'].encode('utf8');new=entry['fragment_new'].encode('utf8')
            if previous.count(old)!=1:raise InstallError('Unsafe or missing anchor for '+rel)
            blob=previous.replace(old,new,1)
            if sha(blob)!=entry['expected_output_sha256'][current]:
                raise InstallError('Derived file checksum mismatch: '+rel)
        else:raise InstallError('Invalid operation '+rel)
        edits[rel]=(previous,blob)
        statuses.append(('UPDATE',rel))
    for ign in ['.gitignore','.assetsignore']:
        target=checked(root,ign)
        if not target.is_file():raise InstallError('Missing '+ign)
        previous=target.read_bytes()
        try:source=previous.decode('utf8')
        except UnicodeError:raise InstallError('Cannot parse '+ign)
        missing=[s for s in manifest['ignore_rules'] if s not in source.splitlines()]
        if not missing:
            statuses.append(('ALREADY',ign));continue
        if source and not source.endswith('\n'):source+='\n'
        source+='\n# Local-only Story World tester entry assets and backups\n'+'\n'.join(missing)+'\n'
        edits[ign]=(previous,source.encode('utf8'))
        statuses.append(('UPDATE',ign))
    return statuses,edits

def apply(root:Path,edits):
    if not edits:return None
    backroot=checked(root,BACKUP)
    backroot.mkdir(exist_ok=True)
    backup=Path(tempfile.mkdtemp(prefix=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-',dir=str(backroot)))
    replacements=[];done=[]
    try:
        for rel,(old,new) in edits.items():
            b=backup/'before'/rel;b.parent.mkdir(parents=True,exist_ok=True);b.write_bytes(old)
            target=checked(root,rel)
            fd,tmp=tempfile.mkstemp(prefix='.story-entry-',dir=str(target.parent))
            try:
                with os.fdopen(fd,'wb') as handle:handle.write(new)
                os.chmod(tmp,target.stat().st_mode & 0o777)
                replacements.append((rel,Path(tmp)))
            except BaseException:
                if os.path.exists(tmp):os.unlink(tmp)
                raise
        # Recheck all source versions for concurrent modifications before changing anything.
        for rel,(old,_) in edits.items():
            if checked(root,rel).read_bytes()!=old:
                raise InstallError('Concurrent changes detected in '+rel)
        for rel,tmp in replacements:
            os.replace(tmp,checked(root,rel));done.append(rel)
        (backup/'receipt.json').write_text(json.dumps({'version':'story-tester-entry-v1','files':list(edits),'after_sha256':{k:sha(v[1]) for k,v in edits.items()}},indent=2),encoding='utf8')
        return backup
    except BaseException:
        for rel in reversed(done):
            try:checked(root,rel).write_bytes(edits[rel][0])
            except OSError as e:print('ROLLBACK FAILED for '+rel+': '+str(e),file=sys.stderr)
        raise
    finally:
        for _,tmp in replacements:
            try:tmp.unlink(missing_ok=True)
            except OSError:pass

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check',action='store_true',help='read-only compatibility check')
    p.add_argument('--root',type=Path,default=Path.cwd())
    args=p.parse_args()
    try:
        root=args.root.resolve()
        statuses,edits=make_plan(root)
        for action,name in statuses:print(f'{action:7} {name}')
        print('Preflight passed:',len(edits),'changed file(s).')
        if args.check:
            print('DRY RUN: nothing changed.')
            return 0
        backup=apply(root,edits)
        if backup:print('Backup:',backup)
        print('Story world tester entry patch installed. No real wallet or personal-world access enabled.')
        return 0
    except (InstallError,OSError,KeyError,ValueError,UnicodeError) as e:
        print('STOP: '+str(e),file=sys.stderr)
        return 1
if __name__=='__main__':raise SystemExit(main())
