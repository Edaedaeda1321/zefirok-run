from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT.parent/'screenshots'; ART.mkdir(exist_ok=True)
HTML=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for is_mobile, size in [(False,{'width':1440,'height':960}),(True,{'width':390,'height':844})]:
  page=browser.new_page(viewport=size,device_scale_factor=1,has_touch=is_mobile,is_mobile=is_mobile)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML,wait_until='load',timeout=75000)
  page.locator('#welcomeStart').click(timeout=15000)
  assert page.locator('.catalog-card').count()==33
  assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().available')==188
  assert page.evaluate('Object.keys(window.ZeffiEmbeddedSprites).length')==188
  assert page.evaluate("catalogSpriteId('cottage',0)")=='flower_v1_house_small_n'
  assert page.evaluate("catalogSpriteId('family-home',1)")=='flower_v1_family_house_e'
  assert page.evaluate("catalogSpriteId('coffee-house',2)")=='flower_v1_cafe_s'
  assert page.evaluate("catalogSpriteId('bench',3)")=='flower_v1_bench_w'
  assert page.evaluate("catalogSpriteId('cottage',0,'build_01')")=='world_house_small_build_01_n'
  page.evaluate('''() => {
   state.city.wallet={points:999999,coffee:999999,treats:999999}; // sprite showcase uses test funds
   const assignments = [
    ['family-home',4,5,1], ['coffee-kiosk',10,3,1], ['coffee-house',14,8,2],
    ['villa',17,11,3], ['bakery',4,16,3], ['cottage',10,17,2],
    ['tree',2,12,0], ['fountain',20,18,1], ['bench',12,11,3], ['lamp',18,3,1],
    ['flower-shop',18,5,0],['garden',15,16,0],['extra-bush',8,19,0],
    ['plaza-cozy-tiled',3,8,0],['plaza-monument-base',16,19,0]
   ];
   const failures=[];
   for (const [kind,x,y,r] of assignments) {
     try {state.city=addObject(state.city,CATALOG,kind,x,y,r,Date.now()-240000);}
     catch(e){failures.push(kind+':'+e.code)}
   }
   window.flowerPreviewFailures=failures;
   if(window.innerWidth>700){state.camera.zoom=.77;}else{
     state.camera.zoom=.90;
     const sz=SIZE(),p=isoToScreen(12,11,sz,{x:0,y:0,zoom:state.camera.zoom});
     state.camera.x=sz.width/2-p.x;state.camera.y=sz.height/2-p.y;
   }
   updateUI();refreshArt();scheduleDraw();
  }''')
  page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading === 0',timeout=65000)
  page.wait_for_timeout(800)
  stats=page.evaluate('window.WorldZeffiSandbox.getArtStatus()')
  print('mobile' if is_mobile else 'desktop',stats,'placement problems:',page.evaluate('window.flowerPreviewFailures'))
  assert stats['failed']==0 and stats['loaded']>35,stats
  for kind in ['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery','tree','fountain','bench','lamp']:
    page.evaluate('''kind => {
      const obj=state.city.objects.find(o=>o.kind===kind && !o.stored);
      if(obj){const d=CATALOG[obj.kind];drawCatalogThumbnail(document.querySelector('.catalog-card[data-kind="'+kind+'"] canvas.building-thumbnail'),d);}
    }''',kind)
  page.screenshot(path=str(ART/('flower-style-mobile.png' if is_mobile else 'flower-style-desktop.png')),full_page=True)
  if is_mobile:
   page.locator('#categoryTabs button').filter(has_text='Декор').tap()
   page.locator('.catalog-card[data-kind="bench"]').tap()
   assert page.locator('#editActions').is_visible()
   assert page.evaluate('state.draft.rotation')==0
   page.locator('#rotateButton').tap()
   assert page.evaluate('state.draft.rotation')==1
   page.locator('#confirmEdit').tap()
   assert page.evaluate("window.WorldZeffiSandbox.getCity().objects.at(-1).kind")=='bench'
   assert page.evaluate("window.WorldZeffiSandbox.getCity().objects.at(-1).rotation")==1
   assert page.evaluate("catalogSpriteId('bench', 1)")=='flower_v1_bench_e'
   page.locator('#artModeButton').tap()
   assert not page.evaluate('window.WorldZeffiSandbox.getArtStatus().enabled')
   page.locator('#artModeButton').tap()
   assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().enabled')
  assert not errors,errors
  page.close()
 browser.close()
print('PASS new pack: 4 directions, complete-stage priority, preserved construction, 33 purchasable catalog objects, render desktop/mobile, rotate/save/decor art toggle')
