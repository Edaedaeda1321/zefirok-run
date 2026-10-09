"""Browser smoke and isolated demo screenshots for Core+Extra game preview."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'screenshots';OUT.mkdir(exist_ok=True)
HTML=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 desktop=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
 errors=[];desktop.on('pageerror',lambda e:errors.append(str(e)))
 desktop.set_content(HTML,wait_until='load',timeout=30000)
 desktop.locator('#welcomeStart').click()
 assert desktop.locator('.catalog-card').count()==33
 assert desktop.evaluate("Object.keys(window.ZeffiEmbeddedSprites).length")==188
 # Exercise localized catalog navigation and selectable floor art.
 for group, count in [('plazas',8),('decor',16)]:
  desktop.locator('#categoryTabs button').filter(has_text={'plazas':'Площадки','decor':'Декор'}[group]).click()
  assert desktop.locator('.catalog-card').count()==count,(group,desktop.locator('.catalog-card').count())
 desktop.locator('#categoryTabs button').filter(has_text='Все').click()
 desktop.evaluate('''() => {
   // Construct a visually diverse city using the REAL engine, no raw object mutations.
   state.city.wallet={points:999999,coffee:999999,treats:999999}; // art showcase only
   const assignments = [
    ['flower-shop',17,4,0],['garden',17,8,1],['playground',3,17,2],['monument',17,17,3],
    ['plaza-city-square',6,4,0],['plaza-monument-base',16,16,0],['plaza-cozy-tiled',3,3,0],
    ['extra-tree',4,12,0],['extra-bench',6,10,0],['extra-arch',19,12,0],
    ['extra-planter',21,16,0],['extra-sign',14,16,0],['extra-sweet_object',5,13,0],
    ['extra-bush',6,18,0],['extra-lamp',2,15,0],['extra-flowerbed',4,19,0],
    ['extra-fountain',19,20,0]
   ];
   const failures = [];
   for(const [kind,x,y,r] of assignments){
     try {state.city=addObject(state.city,CATALOG,kind,x,y,r,Date.now()-100000)}
     catch(e){failures.push(kind+':'+e.code)}
   }
   window.demoFailures=failures;
   state.camera.zoom=.77;
   updateUI();scheduleDraw();refreshArt();
 }''')
 failures=desktop.evaluate('window.demoFailures'); print('Demo placement rejected (expected possible collisions):',failures)
 # Visual source must load all used new objects.
 desktop.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 desktop.wait_for_timeout(450)
 print('Desktop assets:',desktop.evaluate('window.WorldZeffiSandbox.getArtStatus()'))
 assert desktop.evaluate('window.WorldZeffiSandbox.getArtStatus().failed')==0
 assert desktop.evaluate('window.WorldZeffiSandbox.getArtStatus().loaded')>40
 desktop.screenshot(path=str(OUT/'extra-pack-desktop.png'),full_page=True)
 mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
 mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
 mobile.set_content(HTML,wait_until='load',timeout=30000)
 mobile.locator('#welcomeStart').tap()
 assert mobile.locator('.catalog-card').count()==33
 mobile.locator('#categoryTabs button').filter(has_text='Площадки').tap()
 assert mobile.locator('.catalog-card').count()==8
 mobile.locator('.catalog-card[data-kind="plaza-city-square"]').tap()
 assert mobile.locator('#editActions').is_visible()
 assert mobile.locator('#confirmEdit').is_enabled()
 mobile.locator('#confirmEdit').tap()
 assert mobile.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1).kind')=='plaza-city-square'
 mobile.locator('#categoryTabs button').filter(has_text='Заведения').tap()
 mobile.locator('.catalog-card[data-kind="flower-shop"]').tap()
 mobile.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 assert mobile.evaluate('catalogSpriteId("flower-shop", 3)')=='extra_flower_shop_w'
 mobile.locator('#rotateButton').tap()
 assert mobile.evaluate('state.draft.rotation')==1
 mobile.locator('#cancelEdit').tap()
 assert mobile.locator('#categoryTabs button').filter(has_text='Дорожки').count()==0
 mobile.locator('#toolRoad').tap()
 mobile.evaluate('extendRoad({x:16,y:13})')
 assert mobile.locator('#confirmEdit').is_enabled()
 mobile.locator('#confirmEdit').tap()
 assert mobile.evaluate('window.WorldZeffiSandbox.getCity().roads.length')==10
 mobile.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=30000)
 mobile.screenshot(path=str(OUT/'extra-pack-mobile.png'),full_page=True)
 assert not errors,errors
 assert not mobile_errors,mobile_errors
 print('PASS: desktop visual; mobile categories, plaza, rotation, paid Road, no browser errors')
 desktop.close(); mobile.close(); browser.close()
