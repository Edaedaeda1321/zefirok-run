"""End-to-end art runtime regression for real asset-integrated single-file preview.

Uses a browser content document, because local TCP navigation is restricted here.
Do not consider this an authenticated Telegram/production test.
"""
from pathlib import Path
import io
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SHOTS=ROOT.parent/'screenshots'
SHOTS.mkdir(exist_ok=True)
html=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(html,wait_until='load',timeout=30000)
 page.locator('#welcomeStart').tap()
 page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 status=page.evaluate('window.WorldZeffiSandbox.getArtStatus()')
 assert status['enabled'] is True and status['available']==188 and status['loaded']>=20 and status['failed']==0,status
 assert page.evaluate('Object.keys(window.ZeffiEmbeddedSprites).length')==188
 print('Initial sprites',status)
 before_city=page.evaluate('window.WorldZeffiSandbox.getCity()')
 before=Image.open(io.BytesIO(page.locator('#worldCanvas').screenshot())).convert('RGB')
 page.locator('#artModeButton').tap()
 assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().enabled') is False
 assert page.evaluate('window.WorldZeffiSandbox.getCity()')==before_city
 legacy=Image.open(io.BytesIO(page.locator('#worldCanvas').screenshot())).convert('RGB')
 diff=ImageChops.difference(before,legacy).convert('L')
 assert sum(1 for v in diff.getdata() if v>20)>2000,'Art switch did not change rendering'
 page.locator('#artModeButton').tap()
 assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().enabled') is True
 print('3D/2D fallback toggle passed and save unchanged')
 page.locator('.catalog-card[data-kind="family-home"]').tap()
 assert page.locator('#editActions').is_visible()
 screenshots=[]
 for r in range(4):
  page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
  page.wait_for_timeout(100)
  screenshots.append(Image.open(io.BytesIO(page.locator('#worldCanvas').screenshot())).convert('RGB'))
  assert page.evaluate('state.draft.rotation')==r
  if r<3:page.locator('#rotateButton').tap()
 for left,right in zip(screenshots,screenshots[1:]):
  delta=ImageChops.difference(left,right).convert('L')
  change=sum(1 for v in delta.getdata() if v>25)
  assert change>250,f'Rotation did not switch directional sprite enough: {change}'
 print('4 distinct 3D rotations on a rectangular footprint passed')
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').tap()
 assert page.evaluate('window.WorldZeffiSandbox.getStats().buildings')==5
 new_item=page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)')
 assert new_item['kind']=='family-home' and new_item['rotation']==3
 assert new_item['buildReadyAt']>new_item['buildStartedAt']>0
 assert page.locator('#finishBuildTest').is_visible()
 page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 assert page.evaluate("Array.from(document.querySelectorAll('.catalog-card[data-kind="+'"family-home"'+"]')).length")>0
 status=page.evaluate('window.WorldZeffiSandbox.getArtStatus()')
 print('Construction/rotation status',status)
 page.screenshot(path=str(SHOTS/'core-pack-mobile-building.png'),full_page=True)
 assert page.locator('#storeSelected').is_visible()
 page.locator('#storeSelected').tap()
 stored=page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)')
 assert stored['uid']==new_item['uid'] and stored['stored']
 page.locator('#warehouseButton').tap()
 page.locator('.catalog-card[data-kind="family-home"]').last.tap()
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').tap()
 restored=page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)')
 assert restored['uid']==new_item['uid'] and not restored['stored']
 assert restored['buildReadyAt']==new_item['buildReadyAt']
 print('Store/restore keeps ownership, timer, asset type')
 page.locator('#toolExpand').tap()
 assert page.locator('#confirmEdit').is_enabled()
 parcels_before=page.evaluate('window.WorldZeffiSandbox.getCity().parcels.length')
 page.locator('#confirmEdit').tap()
 assert page.evaluate('window.WorldZeffiSandbox.getCity().parcels.length')==parcels_before+1
 page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 page.screenshot(path=str(SHOTS/'core-pack-mobile-expanded.png'),full_page=True)
 print('4x4 expansion and purchased-ground rendering passed')
 if errors:raise AssertionError(errors)
 print('PASSED: browser sprite rendering, 3D toggle, four rotations, construction, warehouse, expansion; page errors 0')
 page.close();browser.close()
