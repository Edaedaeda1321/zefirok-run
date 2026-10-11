#!/usr/bin/env python3
"""Apply a narrow, preflighted shop card UI change to an installed v17+ world.

Uses the EXISTING season-pass WebP. No economics, catalog unlock rules,
construction paths, player saves, or game assets are changed.
"""
from __future__ import annotations
import argparse
import os
import tempfile
from pathlib import Path

OLD_MARKUP = '''  if(locked){
   const levelTag=document.createElement('span');levelTag.className='catalog-level-lock';
   levelTag.textContent=`🔒 Ур. ${shopRequiredLevel(def)}`;fig.append(levelTag);
  }'''
NEW_MARKUP = '''  if(locked){
   // Match the season pass: dim the reward art and layer the existing 3D lock.
   // Use a div (not span): world.css gives every .catalog-figure span a 38px font.
   const mark=document.createElement('div');mark.className='catalog-lock-mark';
   mark.setAttribute('aria-hidden','true');
   const icon=document.createElement('img');icon.className='catalog-lock-icon';
   icon.src='../assets/ui/icon_closed.webp';icon.alt='';icon.decoding='async';
   mark.append(icon);fig.append(mark);
  }'''

OLD_CSS = '''/* v17: Shop progression; compact enough for the Telegram bottom sheet. */
.catalog-card.is-level-locked{border-color:#dfcbd3;background:linear-gradient(160deg,#fdf8f9,#f3eaed)}
.catalog-card.is-level-locked .building-thumbnail{opacity:.57;filter:grayscale(.44) saturate(.75)}
.catalog-card.is-level-locked .catalog-figure::after{opacity:.35}
.catalog-level-lock{position:absolute;z-index:3;top:6px;right:6px;padding:5px 7px;border-radius:9px;background:#fff9faed;color:#955778;box-shadow:0 1px 6px #8c486229;border:1px solid #eac4d4;font-size:10px;font-weight:900;white-space:nowrap}'''
NEW_CSS = '''/* v18: Locked shop art follows the season-pass reward treatment. */
.catalog-card.is-level-locked{border-color:#dfcbd3;background:linear-gradient(160deg,#fdf8f9,#f3eaed)}
.catalog-card.is-level-locked .catalog-figure{background:linear-gradient(155deg,#faf8f8,#eeecee)}
.catalog-card.is-level-locked .catalog-figure .building-thumbnail{opacity:.53;filter:grayscale(.85) saturate(.68);transform:scale(.96);transition:opacity .2s ease,filter .2s ease,transform .2s ease}
.catalog-card.is-level-locked .catalog-figure::after{opacity:.14}
/* Deliberately a div, not span: the base world.css has .catalog-figure span. */
.catalog-figure .catalog-lock-mark{position:absolute;inset:0;z-index:3;display:grid;place-items:center;width:100%;height:100%;pointer-events:none;line-height:normal;filter:none}
.catalog-figure .catalog-lock-icon{display:block;width:34px;height:34px;max-width:40%;max-height:48%;object-fit:contain;filter:drop-shadow(0 4px 7px rgba(111,70,40,.18))}'''

OLD_MOBILE = ''' .catalog-level-lock{font-size:9px;padding:4px 5px}'''
NEW_MOBILE = ''' .catalog-figure .catalog-lock-icon{width:29px;height:29px}'''

OLD_BUILDER = '''    if filename=='app.js':
        # Offline proof avoids blocking on upfront decode of 100+ embedded images;
        # real web entries retain full fail-safe sprite preload.'''
NEW_BUILDER = '''    if filename=='app.js':
        # Reuse the exact same WebP as the season pass. Offline HTML must inline
        # it so the lock also works over file:// without network access.
        lock_path=ROOT.parent/'assets/ui/icon_closed.webp'
        lock_token="'../assets/ui/icon_closed.webp'"
        if s.count(lock_token)!=1:
            raise ValueError('Expected one shop lock icon reference in app.js')
        s=s.replace(lock_token,"'data:image/webp;base64,"+base64.b64encode(lock_path.read_bytes()).decode('ascii')+"'")
        # Offline proof avoids blocking on upfront decode of 100+ embedded images;
        # real web entries retain full fail-safe sprite preload.'''


def one(text: str, old: str, new: str, name: str) -> str:
    count=text.count(old)
    if count!=1:
        raise ValueError(f'{name}: incompatible source: expected exactly 1 anchor, found {count}')
    return text.replace(old,new,1)


def app(text: str) -> str:
    return one(text, OLD_MARKUP, NEW_MARKUP, 'world/app.js')


def css(text: str) -> str:
    text=one(text,OLD_CSS,NEW_CSS,'world/premium-ui.css')
    return one(text,OLD_MOBILE,NEW_MOBILE,'world/premium-ui.css mobile')


def builder(text: str) -> str:
    return one(text,OLD_BUILDER,NEW_BUILDER,'world/build-standalone.py')


def apply(root: Path, check: bool) -> None:
    targets={'world/app.js':app,'world/premium-ui.css':css,'world/build-standalone.py':builder}
    if not (root/'assets/ui/icon_closed.webp').is_file():
        raise ValueError('The original season-pass lock is missing: assets/ui/icon_closed.webp')
    staged={}
    for filename,transform in targets.items():
        path=root/filename
        if not path.is_file():
            raise ValueError(f'Missing required file: {filename}')
        old=path.read_text(encoding='utf-8')
        new=transform(old)
        staged[path]=new
        print(f'{"CHECK" if check else "UPDATE"} {filename}')
    if check:
        print('PASS: all 3 source files are compatible; no changes made.')
        return
    temps=[]
    try:
        for path,content in staged.items():
            with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=path.parent,prefix='.shop-lock-v18-',delete=False) as temp:
                temp.write(content)
                temps.append((path,Path(temp.name)))
        for path,temp in temps:
            os.replace(temp,path)
        print('Shop locked-card UI v18 installed. No currency or server changes.')
    finally:
        for _,temp in temps:
            temp.unlink(missing_ok=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true',help='Verify without changing project files')
    parser.add_argument('--root',type=Path,default=Path.cwd())
    args=parser.parse_args()
    try:
        apply(args.root,args.check)
    except (ValueError,OSError) as error:
        parser.exit(1,f'ERROR: {error}\n')
