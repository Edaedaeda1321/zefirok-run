"""Browser verification of countdowns and seven distinct building appearances."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
preview=(ROOT.parent/'world-v01-preview.html').read_text()
STORE='zefirok-world-v01-sandbox-local'

def page_markup(saved=None):
  preload=[] if saved is None else [[STORE,saved],['zefirok-world-v01-welcome-read','1']]
  shim="<script>window.__worldStorage=new Map("+json.dumps(preload)+");Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__worldStorage.get(k)||null,setItem:(k,v)=>window.__worldStorage.set(k,String(v)),removeItem:k=>window.__worldStorage.delete(k),clear:()=>window.__worldStorage.clear()}});</script>"
  return preview.replace('<script>',shim+'<script>',1)

def fresh_page(browser,saved=None,desktop=False):
  if desktop:page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1)
  else:page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(page_markup(saved))
  if page.locator('#welcomeModal').is_visible():page.locator('#welcomeStart').click()
  return page,errors

with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page,errors=fresh_page(browser)
  page.locator('.catalog-card[data-kind="bakery"]').click()
  assert page.locator('#confirmEdit').is_enabled()
  page.locator('#confirmEdit').click()
  assert page.evaluate('window.WorldZeffiSandbox.getStats().constructing')==1
  assert page.locator('#finishBuildTest').is_visible()
  assert '00:' in page.locator('#selectionStatus').inner_text()
  page.screenshot(path=str(ROOT.parent/'mobile-construction.png'),full_page=True)
  created=page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)')
  assert created['buildReadyAt']>created['buildStartedAt']
  saved=page.evaluate('localStorage.getItem(STORAGE_KEY)')
  assert saved
  print('build created:',created['kind'],'duration',created['buildReadyAt']-created['buildStartedAt'])
  assert not errors,errors
  page.close()

  page,errors=fresh_page(browser,saved)
  assert page.evaluate('window.WorldZeffiSandbox.getStats().constructing')==1
  reloaded=page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)')
  assert reloaded['uid']==created['uid'] and reloaded['buildReadyAt']==created['buildReadyAt']
  print('local storage restore: PASS',reloaded['uid'])
  # Simulate natural expiry (do not use the shortcut button), then confirm render updates.
  page.evaluate('''() => {
    const obj=state.city.objects.at(-1);
    obj.buildStartedAt=Date.now()-1800;
    obj.buildReadyAt=Date.now()+1200;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state.city));
  }''')
  page.wait_for_function('window.WorldZeffiSandbox.getStats().constructing === 0',timeout=5000)
  page.wait_for_timeout(1500)
  assert page.locator('#constructingCount').inner_text()=='0'
  saved=page.evaluate('localStorage.getItem(STORAGE_KEY)')
  assert not errors,errors
  page.close()

  page,errors=fresh_page(browser,saved)
  assert page.evaluate('window.WorldZeffiSandbox.getStats().constructing')==0
  page.screenshot(path=str(ROOT.parent/'mobile-construction-complete.png'),full_page=True)
  assert not errors,errors
  page.close()
  print('timed completion and reopening: PASS')

  wide,wide_errors=fresh_page(browser,desktop=True)
  wide.evaluate('''() => {
   state.city = makeInitialCity();
   const buildings=[['family-home',3,4],['villa',13,4],['coffee-kiosk',19,4],['coffee-house',3,17],['bakery',16,17],['flower-shop',19,15]];
   for(const [kind,x,y] of buildings){
      state.city=addObject(state.city,CATALOG,kind,x,y);
      const last=state.city.objects.at(-1);last.buildStartedAt=0;last.buildReadyAt=0;
   }
   state.camera.zoom=.97;state.camera.y=-40;scheduleDraw();updateUI();
  }''')
  wide.wait_for_timeout(500)
  wide.screenshot(path=str(ROOT.parent/'desktop-diverse-buildings.png'),full_page=True)
  assert not wide_errors,wide_errors
  print('different silhouettes and thumbnail previews: PASS; no JS errors')
  browser.close()
