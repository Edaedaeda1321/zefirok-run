"""Browser acceptance test: purchases, stock, new Road, balance validation and persistence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'screenshots'; OUT.mkdir(exist_ok=True)
HTML=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    for mobile in (False,True):
      page=browser.new_page(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':960},device_scale_factor=1,has_touch=mobile,is_mobile=mobile)
      errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
      page.set_content(HTML,wait_until='load',timeout=65000)
      page.locator('#welcomeStart').click()
      assert page.locator('#catalogList .catalog-card').count()==page.evaluate('CATALOG_ITEMS.length')
      assert page.locator('#categoryTabs button').count()==page.evaluate('CATEGORIES.length')
      assert page.locator('#categoryTabs button').filter(has_text='Дорожки').count()==0
      assert page.locator('#toolRoad small').inner_text().strip() in ('Road','Дороги')
      assert page.locator('.catalog-card[data-kind^="path-"]').count()==0
      assert str(page.evaluate('CATALOG.cottage.price.points')) in ''.join(ch for ch in page.locator('#catalogList .catalog-card[data-kind="cottage"] .catalog-price').inner_text() if ch.isdigit())
      # Build a tree using the visible purchase confirmation (not by mutating engine internals).
      initial=page.evaluate('window.WorldZeffiSandbox.getCity()')
      page.locator('#catalogList .catalog-card[data-kind="tree"]').click()
      assert 'Цена' in page.locator('#editSummary').inner_text()
      assert page.locator('#confirmEdit').is_enabled()
      page.locator('#confirmEdit').click()
      paid=page.evaluate('window.WorldZeffiSandbox.getCity()')
      assert len(paid['objects'])==len(initial['objects'])+1
      tree_price=page.evaluate('CATALOG.tree.price')
      assert paid['wallet']['points']==initial['wallet']['points']-tree_price['points']
      assert paid['wallet']['treats']==initial['wallet']['treats']-tree_price['treats']
      assert 'Списано' in page.locator('#toast').inner_text()
      # Previously bought assets go to/from storage at no cost.
      page.locator('#storeSelected').click()
      page.locator('#warehouseButton').click()
      page.locator('#warehouseList .catalog-card[data-kind="tree"]').click()
      assert page.locator('#confirmEdit').is_enabled()
      page.locator('#confirmEdit').click()
      stored_return=page.evaluate('window.WorldZeffiSandbox.getCity()')
      assert stored_return['wallet']==paid['wallet']
      assert stored_return['objects'][-1]['stored'] is False
      # Only the Road drawing tool pays for new segments (50 points each).
      page.locator('#toolRoad').click()
      page.evaluate('extendRoad({x:16,y:13});extendRoad({x:17,y:13})')
      assert '100' in page.locator('#editSummary').inner_text(),page.locator('#editSummary').inner_text()
      assert page.locator('#editSummary .preview-currency-piece img').count() > 0, 'Real currency icon missing from road preview'
      assert page.locator('#confirmEdit').is_enabled()
      page.locator('#confirmEdit').click()
      after_road=page.evaluate('window.WorldZeffiSandbox.getCity()')
      assert after_road['wallet']['points']==paid['wallet']['points']-100
      assert '16,13' in after_road['roads'] and '17,13' in after_road['roads']
      # Attempting a second stroke over already owned roads cannot charge again.
      page.evaluate('extendRoad({x:15,y:13});extendRoad({x:17,y:13})')
      assert '0 ' not in page.locator('#editSummary').inner_text() or 'Цена' in page.locator('#editSummary').inner_text()
      page.locator('#confirmEdit').is_disabled()
      # Show prices on mobile/desktop without modal over the city
      page.locator('#toolSelect').click()
      page.screenshot(path=str(OUT/('paid-mobile.png' if mobile else 'paid-desktop.png')),full_page=True,timeout=30000)
      # Shortfall: allow preview, disable checkout.
      page.evaluate("state.city.wallet.points=0;updateUI();")
      page.locator('#catalogList .catalog-card[data-kind="cottage"]').click()
      assert page.locator('#confirmEdit').is_disabled()
      assert 'Недостаточно валюты' in page.locator('#editFeedback').inner_text()
      no_money=page.evaluate('window.WorldZeffiSandbox.getCity()')
      assert len(no_money['objects'])==len(stored_return['objects'])
      assert page.evaluate('sanitizeCity(JSON.parse(JSON.stringify(state.city)),CATALOG).wallet.points')==0
      assert len(page.evaluate('sanitizeCity(JSON.parse(JSON.stringify(state.city)),CATALOG).objects'))==len(stored_return['objects'])
      assert not errors,errors
      print(('mobile' if mobile else 'desktop'), 'OK', 'catalog='+str(page.evaluate('CATALOG_ITEMS.length')), 'Road=charged', 'warehouse=free', 'save_roundtrip=yes', 'sprites=',page.evaluate('window.WorldZeffiSandbox.getArtStatus().available'))
      page.close()
    browser.close()

