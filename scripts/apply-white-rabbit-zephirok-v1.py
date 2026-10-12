#!/usr/bin/env python3
"""Safe self-installer for White Rabbit / Zephirok combined landmark v1.

Run from project root:
  python3 scripts/apply-white-rabbit-zephirok-v1.py --check
  python3 scripts/apply-white-rabbit-zephirok-v1.py
"""
from __future__ import annotations
import argparse,datetime,hashlib,json,os,shutil,sys,tempfile
from pathlib import Path
PAYLOAD=Path(__file__).resolve().parent/'.world-white-rabbit-v1'
VERSION='zeffi-white-rabbit-zephirok-v1.0.0'
class Conflict(RuntimeError):pass

def digest(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def safe(root:Path,rel:str)->Path:
 p=Path(rel)
 if not p.parts or p.is_absolute() or '..' in p.parts or '\\' in rel:raise Conflict('Unsafe path: '+rel)
 at=root
 for part in p.parts:
  at=at/part
  if at.is_symlink():raise Conflict('Symlink refused: '+rel)
 if at.exists() and not at.is_file():raise Conflict('Expected regular file: '+rel)
 return at

def snapshot(path:Path)->bytes|None:return path.read_bytes() if path.is_file() else None

def plan(root:Path):
 m=json.loads(safe(PAYLOAD,'manifest.json').read_text(encoding='utf-8'))
 if m.get('version')!=VERSION:raise Conflict('Unexpected patch version')
 if not (root/'world.html').is_file() or not (root/'story-world.html').is_file():
  raise Conflict('Run from the zefirok-run project root with Story World installed')
 for rel,expected in m['dependencies'].items():
  data=snapshot(safe(root,rel))
  if data is None or digest(data)!=expected:raise Conflict('Dependency changed: '+rel+'; do not overwrite newer code')
 actions=[];edits={}
 for rel,info in m['targets'].items():
  target=safe(root,rel);old=snapshot(target);new=safe(PAYLOAD,rel).read_bytes()
  if digest(new)!=info['after']:raise Conflict('Corrupt payload: '+rel)
  if old==new:actions.append(('ALREADY',rel));continue
  if (None if old is None else digest(old)) not in info['before']:
   raise Conflict('Unrecognized current version: '+rel+'; STOP, unknown edits will not be overwritten')
  edits[rel]=(old,new);actions.append(('CREATE' if old is None else 'UPDATE',rel))
 for rel,rules in m['ignore_rules'].items():
  target=safe(root,rel);old=snapshot(target)
  if old is None:raise Conflict('Missing '+rel)
  text=old.decode('utf-8');known=set(text.splitlines());missing=[x for x in rules if x not in known]
  if missing:
   new=(text.rstrip('\n')+'\n\n# Local-only White Rabbit / Zephirok v1 backups\n'+'\n'.join(missing)+'\n').encode('utf-8')
   edits[rel]=(old,new);actions.append(('UPDATE',rel))
  else:actions.append(('ALREADY',rel))
 return actions,edits

def apply(root:Path,edits:dict):
 if not edits:return None
 for rel,(old,_) in edits.items():
  if snapshot(safe(root,rel))!=old:raise Conflict('Concurrent file edit during preflight: '+rel)
 base=root/'.world-white-rabbit-v1-backup'
 if base.is_symlink():raise Conflict('Unsafe backup symlink')
 base.mkdir(exist_ok=True)
 backup=Path(tempfile.mkdtemp(prefix=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-'),dir=base))
 receipt={'version':VERSION,'status':'prepared','files':[]};done=[]
 with tempfile.TemporaryDirectory(prefix='.stage-',dir=backup) as tmp:
  stage=Path(tmp)
  for rel,(old,new) in edits.items():
   target=safe(root,rel);mode=(target.stat().st_mode&0o777) if target.is_file() else 0o644
   dst=stage/rel;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(new);os.chmod(dst,mode)
   if old is not None:
    bak=backup/'before'/rel;bak.parent.mkdir(parents=True,exist_ok=True);bak.write_bytes(old);os.chmod(bak,mode)
   receipt['files'].append({'path':rel,'before':None if old is None else digest(old),'after':digest(new),'mode':mode})
  record=backup/'receipt.json';record.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
  try:
   for rel,(old,new) in edits.items():
    target=safe(root,rel)
    if snapshot(target)!=old:raise Conflict('Changed while applying: '+rel)
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
      restore=stage/(rel+'.restore');restore.parent.mkdir(parents=True,exist_ok=True)
      shutil.copy2(backup/'before'/rel,restore);os.replace(restore,target)
    except (OSError,Conflict) as e:manual.append(rel+': '+str(e))
   raise Conflict('Installation failed: '+str(error)+('. MANUAL RECOVERY: '+'; '.join(manual) if manual else '. Completed edits rolled back.')) from error
 return backup

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--check',action='store_true',help='Read-only compatibility check')
 ap.add_argument('--root',type=Path,default=Path.cwd())
 args=ap.parse_args()
 try:
  root=args.root.expanduser().resolve();actions,edits=plan(root)
  for action,rel in actions:print(f'{action:7} {rel}')
  print(f'Preflight PASSED: {len(edits)} change(s).')
  if args.check:print('Dry run: no game files changed.');return 0
  backup=apply(root,edits)
  if backup:print('Backup: '+str(backup))
  print('White Rabbit / Zephirok landmark v1 installed. No Git changes or production deploy were performed.')
  return 0
 except (OSError,ValueError,KeyError,UnicodeError,Conflict) as e:
  print('ERROR: '+str(e),file=sys.stderr)
  print('STOP. Preserve local modifications; do not force-copy files.',file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())
