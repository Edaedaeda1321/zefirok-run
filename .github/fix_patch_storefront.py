from pathlib import Path
p = Path('.github/patch_storefront_featured.py')
lines = p.read_text(encoding='utf-8').splitlines()
changed = False
for i, line in enumerate(lines):
    if line.startswith('preferred_pattern = re.compile('):
        lines[i] = r'''preferred_pattern = re.compile(r'(?m)^(\s*)const preferred = \[[^\n]*"case-alex"[^\n]*\]\.find\([^\n]+\);')'''
        changed = True
        break
if not changed:
    raise SystemExit('preferred pattern line not found')
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
Path('.github/fix_patch_storefront.py').unlink(missing_ok=True)
