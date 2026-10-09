from pathlib import Path
from playwright.sync_api import sync_playwright
import runpy
import io
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
html=runpy.run_path(str(Path(__file__).with_name('browser-smoke.py')))['html']
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load',timeout=30000)
 page.locator('#welcomeStart').tap()
 assert page.locator('#topupWallet').is_visible()
 assert page.evaluate('state.city.version')==2
 assert page.locator('#toolExpand').is_visible()
 # Visual square rotation should differ even though footprint does not change.
 page.locator('.catalog-card[data-kind="cottage"]').tap()
 assert page.evaluate('state.draft.kind')=='cottage'
 before=Image.open(io.BytesIO(page.locator('#worldCanvas').screenshot())).convert('RGB')
 before.save(ROOT.parent/'rotation-before.png')
 page.locator('#rotateButton').tap()
 page.wait_for_timeout(80)
 after=Image.open(io.BytesIO(page.locator('#worldCanvas').screenshot())).convert('RGB')
 after.save(ROOT.parent/'rotation-after.png')
 assert page.evaluate('state.draft.rotation')==1
 diff=ImageChops.difference(before,after)
 changed=sum(1 for c in diff.convert('L').get_flattened_data() if c>18)
 print('square rotation changed canvas pixels:',changed)
 assert changed > 200,changed
 page.locator('#confirmEdit').tap()
 assert page.evaluate('state.city.objects.at(-1).rotation')==1
 assert page.locator('#finishBuildTest').is_visible()
 assert '30' not in page.locator('#finishBuildTest').inner_text()
 # at exactly 30 secs cottage is free.
 cashBefore=page.evaluate('state.city.wallet.coffee')
 page.locator('#finishBuildTest').tap()
 assert page.evaluate('state.city.wallet.coffee')==cashBefore
 assert page.evaluate('state.city.objects.at(-1).buildReadyAt')==0
 print('free construction skip passed')
 # Build a large villa. Paid when more than 30 seconds remain.
 page.locator('.catalog-card[data-kind="villa"]').tap()
 page.locator('#confirmEdit').tap()
 assert page.locator('#finishBuildTest').is_visible()
 assert page.locator('#finishBuildTest').inner_text().find('15')!=-1
 walletBefore=page.evaluate('state.city.wallet.coffee')
 page.locator('#finishBuildTest').tap()
 assert page.locator('#skipModal').is_visible()
 page.locator('#skipAccept').tap()
 walletAfter=page.evaluate('state.city.wallet.coffee')
 print('paid skip coffee before/after:',walletBefore,walletAfter)
 assert walletBefore-walletAfter==15
 assert page.evaluate('state.city.objects.at(-1).buildReadyAt')==0
 print('paid construction skip passed')
 # Buy plots repeatedly. Use UI, not engine calls.
 pointsBefore=page.evaluate('state.city.wallet.points')
 treatsBefore=page.evaluate('state.city.wallet.treats')
 page.locator('#toolExpand').tap()
 assert page.locator('#editActions').is_visible()
 assert page.locator('#confirmEdit').is_enabled()
 page.screenshot(path=str(ROOT.parent/'mobile-expand-selection.png'))
 page.locator('#confirmEdit').tap()
 assert page.evaluate('state.city.parcels.length')==1
 page.locator('#confirmEdit').tap()
 assert page.evaluate('state.city.parcels.length')==2
 assert page.evaluate('state.city.wallet.points')==pointsBefore-3600
 assert page.evaluate('state.city.wallet.treats')==treatsBefore-30
 assert page.evaluate('state.city.parcels[0]')=='6,2'
 assert page.evaluate('state.city.parcels[1]')=='7,2'
 page.screenshot(path=str(ROOT.parent/'mobile-expanded-plot.png'))
 print('repeat 4x4 parcel purchases passed')
 # Top-up is sandbox-only and increases three currency balances.
 before_topup=page.evaluate('({...state.city.wallet})')
 page.locator('#topupWallet').tap()
 assert page.evaluate('state.city.wallet.points')==before_topup['points']+10000
 print('sandbox wallet replenishment passed')
 assert not errors,errors
 print('Browser errors',errors)
 b.close()
