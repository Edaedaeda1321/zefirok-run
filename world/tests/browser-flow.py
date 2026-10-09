from pathlib import Path
from playwright.sync_api import sync_playwright
exec(Path(__file__).with_name('browser-smoke.py').read_text().split("if __name__=='__main__':")[0])

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load',timeout=20000)
 page.locator('#welcomeStart').click()
 page.wait_for_timeout(100)
 stats=lambda:page.evaluate('window.WorldZeffiSandbox.getStats()')
 def localpoint(tx,ty):
  result=page.evaluate('([x,y])=>isoToScreen(x,y,{width:worldCanvas.getBoundingClientRect().width,height:worldCanvas.getBoundingClientRect().height},state.camera)',[tx,ty])
  box=page.locator('#worldCanvas').bounding_box()
  return {'x':box['x']+result['x'],'y':box['y']+result['y']}
 def drag(start,end):
  a=localpoint(*start);b=localpoint(*end)
  page.mouse.move(a['x'],a['y']);page.mouse.down()
  for i in range(1,9):
   t=i/8;page.mouse.move(a['x']+(b['x']-a['x'])*t,a['y']+(b['y']-a['y'])*t)
  page.mouse.up();page.wait_for_timeout(100)
 print('initial',stats())
 page.locator('.catalog-card[data-kind="tree"]').click()
 print('preview visible',page.locator('#editActions').is_visible(), 'button enabled',page.locator('#confirmEdit').is_enabled(), 'mode',page.evaluate('state.mode'))
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').click()
 assert stats()['buildings']==5
 print('after building',stats())
 assert page.locator('#selectionPanel').is_visible()
 page.locator('#storeSelected').click()
 assert stats()['stored']==1 and stats()['buildings']==4
 print('after warehouse deposit',stats())
 page.locator('#warehouseButton').click()
 assert page.locator('#warehouseList').is_visible()
 assert page.locator('#warehouseList .catalog-card').count()==1
 page.locator('#warehouseList .catalog-card').click()
 print('restore preview',page.locator('#editActions').is_visible(),page.locator('#confirmEdit').is_enabled())
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').click()
 assert stats()['buildings']==5 and stats()['stored']==0
 print('after warehouse restore',stats())
 page.locator('#moveSelected').click()
 a=localpoint(16.5,17.5)
 page.mouse.click(a['x'],a['y'])
 print('move valid',page.locator('#confirmEdit').is_enabled(), 'draft',page.evaluate('state.draft'))
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').click()
 assert stats()['buildings']==5
 print('after moving',page.evaluate('window.WorldZeffiSandbox.getCity().objects.at(-1)'))
 page.locator('#toolRoad').click()
 drag((11.5,14.5),(11.5,17.5))
 print('road preview',page.locator('#editActions').is_visible(),page.locator('#confirmEdit').is_enabled(),page.evaluate('state.roadDraft'))
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').click()
 assert stats()['roads']==13
 print('after road draw',stats())
 page.locator('#toolErase').click()
 drag((11.5,16.5),(11.5,17.5))
 print('erase preview',page.locator('#editActions').is_visible(),page.locator('#confirmEdit').is_enabled(),page.evaluate('state.roadDraft'))
 assert page.locator('#confirmEdit').is_enabled()
 page.locator('#confirmEdit').click()
 assert stats()['roads']==11
 print('after road erase',stats())
 page.locator('#undoButton').click();assert stats()['roads']==13
 page.locator('#redoButton').click();assert stats()['roads']==11
 print('undo redo passed',stats())
 page.locator('#centerCamera').click()
 page.screenshot(path=str(ROOT.parent/'mobile-built.png'),full_page=True)
 print('page errors',errors)
 assert not errors
 browser.close()
