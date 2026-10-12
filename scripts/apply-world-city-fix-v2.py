#!/usr/bin/env python3
"""City Fix v2. --check is read-only; normal launch applies an atomic, backed-up patch.
No Git, deployment, network or database operations are performed by this script.
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, shutil, sys, tempfile
from pathlib import Path
PAYLOAD=Path(__file__).resolve().parent/'.world-city-fix-v2'
VERSION='zeffi-city-fix-v2'
class Conflict(RuntimeError): pass

def digest(data):return hashlib.sha256(data).hexdigest()
def safe(root,rel):
 p=Path(rel)
 if not p.parts or p.is_absolute() or '..' in p.parts or '\\' in rel:raise Conflict('Unsafe path: '+rel)
 at=root
 for part in p.parts:
  at=at/part
  if at.is_symlink():raise Conflict('Symlink refused: '+rel)
 if at.exists() and not at.is_file():raise Conflict('Not a regular file: '+rel)
 return at

def snapshot(path):return path.read_bytes() if path.exists() else None

def plan(root):
 m=json.loads(safe(PAYLOAD,'manifest.json').read_text(encoding='utf-8'))
 if m.get('version')!=VERSION:raise Conflict('Unexpected patch version')
 if not(root/'world.html').is_file() or not(root/'story-world.html').is_file():raise Conflict('Run from the project root after installing Story World v1.')
 for rel,expected in m['dependencies'].items():
  data=snapshot(safe(root,rel))
  if data is None or digest(data)!=expected:raise Conflict('Dependency changed: '+rel+'; do not overwrite newer code.')
 actions=[];edits={}
 for rel,info in m['targets'].items():
  data=snapshot(safe(root,rel));new=safe(PAYLOAD,rel).read_bytes()
  if digest(new)!=info['after']:raise Conflict('Corrupt payload: '+rel)
  if data==new:actions.append(('ALREADY',rel));continue
  if (None if data is None else digest(data)) not in info['before']:raise Conflict('Unrecognized current version: '+rel+'; STOP, unknown changes were not overwritten.')
  edits[rel]=(data,new);actions.append(('CREATE' if data is None else 'UPDATE',rel))
 for rel,rules in m['ignore_rules'].items():
  data=snapshot(safe(root,rel))
  if data is None:raise Conflict('Missing '+rel)
  text=data.decode('utf-8');lines=set(text.splitlines());missing=[line for line in rules if line not in lines]
  if missing:
   new=(text.rstrip('\n')+'\n\n# City Fix v2 local-only files\n'+'\n'.join(missing)+'\n').encode('utf-8');edits[rel]=(data,new);actions.append(('UPDATE',rel))
  else:actions.append(('ALREADY',rel))
 return actions,edits

def apply(root,edits):
 if not edits:return None
 for rel,(old,_) in edits.items():
  if snapshot(safe(root,rel))!=old:raise Conflict('Changed during preflight: '+rel)
 backups=root/'.world-city-fix-v2-backup'
 if backups.is_symlink():raise Conflict('Backup directory must not be a symlink')
 backups.mkdir(exist_ok=True)
 backup=Path(tempfile.mkdtemp(prefix=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-'),dir=backups))
 receipt={'version':VERSION,'status':'prepared','files':[]}
 done=[]
 with tempfile.TemporaryDirectory(prefix='.stage-',dir=backup) as tmp:
  stage=Path(tmp)
  for rel,(old,new) in edits.items():
   target=safe(root,rel);mode=(target.stat().st_mode&0o777) if target.exists() else 0o644
   file=stage/rel;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(new);os.chmod(file,mode)
   if old is not None:
    copy=backup/'before'/rel;copy.parent.mkdir(parents=True,exist_ok=True);copy.write_bytes(old);os.chmod(copy,mode)
   receipt['files'].append({'path':rel,'before':None if old is None else digest(old),'after':digest(new),'mode':mode})
  record=backup/'receipt.json';record.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
  try:
   for rel,(old,new) in edits.items():
    target=safe(root,rel)
    if snapshot(target)!=old:raise Conflict('Changed while installing: '+rel)
    target.parent.mkdir(parents=True,exist_ok=True);os.replace(stage/rel,target);done.append((rel,old,new))
   receipt['status']='applied';record.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
  except (OSError,Conflict) as error:
   manual=[]
   for rel,old,new in reversed(done):
    try:
     target=safe(root,rel)
     if snapshot(target)!=new:raise Conflict('External edit after installation; preserving it')
     if old is None:target.unlink()
     else:
      copy=stage/(rel+'.restore');copy.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(backup/'before'/rel,copy);os.replace(copy,target)
    except (OSError,Conflict) as restore_error:manual.append(rel+': '+str(restore_error))
   raise Conflict('Installation failed: '+str(error)+('. MANUAL RECOVERY: '+'; '.join(manual) if manual else '. Written files rolled back.')) from error
 return backup

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--check',action='store_true');ap.add_argument('--root',type=Path,default=Path.cwd());args=ap.parse_args()
 try:
  root=args.root.expanduser().resolve();actions,edits=plan(root)
  for action,rel in actions:print(f'{action:7} {rel}')
  print(f'Preflight PASSED: {len(edits)} change(s).')
  if args.check:print('Dry run: no project files changed.');return 0
  backup=apply(root,edits)
  if backup:print('Backup: '+str(backup))
  print('City Fix v2 installed (or ALREADY installed).')
  print('Run: node scripts/check-world-city-fix-v2.mjs')
  print('No migrations, Git operations or production deploy were performed.');return 0
 except (OSError,ValueError,KeyError,UnicodeError,Conflict) as error:
  print('ERROR: '+str(error),file=sys.stderr);print('STOP. Do not force-copy files over another version.',file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())
