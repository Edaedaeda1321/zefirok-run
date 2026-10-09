import runpy
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=runpy.run_path(str(Path(__file__).with_name('browser-smoke.py')))['html']
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.locator('#welcomeStart').tap()
 page.locator('.catalog-card[data-kind="cottage"]').tap()
 assert page.locator('#editActions').is_visible()
 # Pointer-based draft drag under touch emulation.
 info=page.evaluate('state.draft')
 assert info['kind']=='cottage'
 page.locator('#rotateButton').tap()
 assert page.evaluate('state.draft.rotation')==1
 page.locator('#confirmEdit').tap()
 assert page.evaluate('window.WorldZeffiSandbox.getStats().buildings')==5
 print('touch placing and rotating passed')
 page.locator('#toolRoad').tap()
 def point(x,y):
  v=page.evaluate('([x,y])=>isoToScreen(x,y,{width:worldCanvas.getBoundingClientRect().width,height:worldCanvas.getBoundingClientRect().height},state.camera)',[x,y])
  box=page.locator('#worldCanvas').bounding_box();return {'x':box['x']+v['x'],'y':box['y']+v['y'],'id':0}
 a=point(15.5,14.5);z=point(15.5,16.5)
 client=page.context.new_cdp_session(page)
 client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[a]})
 for i in range(1,11):
  t=i/10;mid={'x':a['x']+(z['x']-a['x'])*t,'y':a['y']+(z['y']-a['y'])*t,'id':0}
  client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[mid]})
 client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 print('touch road draft',page.evaluate('state.roadDraft'))
 page.wait_for_timeout(350)
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').tap()
 page.wait_for_function('window.WorldZeffiSandbox.getStats().roads===12',timeout=2000)
 print('touch after confirm', page.evaluate('window.WorldZeffiSandbox.getStats()'))
 assert page.evaluate('window.WorldZeffiSandbox.getStats().roads')==12
 print('touch road stroke passed')
 print('page errors',errors)
 assert not errors
 b.close()
