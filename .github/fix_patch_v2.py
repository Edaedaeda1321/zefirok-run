from pathlib import Path
p = Path('.github/patch_storefront_featured_v2.py')
s = p.read_text(encoding='utf-8')
old = r"\\'"
if old not in s:
    raise SystemExit('encoded quote matcher not found')
s = s.replace(old, '&#x27;')
p.write_text(s, encoding='utf-8')
Path('.github/fix_patch_v2.py').unlink(missing_ok=True)
