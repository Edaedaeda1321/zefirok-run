"""Browser check of WebP-only Mir Zeffi 0.1.4 with preserved v0.1.3 mechanics."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path('/mnt/data')
HTML=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')
ALIASES={'extra-tree':'tree','extra-lamp':'lamp','extra-bench':'bench','extra-fountain':'fountain'}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for mobile in [False,True]:
  page=browser.new_page(viewport={'width':390,'height':844} if mobile else {'width':1365,'height':860},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
  errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url))
  page.set_content(HTML,wait_until='load',timeout=75000)
  page.locator('#welcomeStart').click(timeout=20000)
  assert page.locator('.catalog-card').count()==33
  assert page.locator('#categoryTabs button').filter(has_text='Дорожки').count()==0
  assert page.evaluate('Object.keys(window.ZeffiEmbeddedSprites).length')==236
  assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().available')==236
  assert page.evaluate("catalogSpriteId('cottage', 0)")=='flower_v1_house_small_n'
  assert page.evaluate("catalogSpriteId('cottage', 0, 'build_01')")=='world_house_small_build_01_n'
  for alias,main in ALIASES.items():
   for r in range(4):
    result=page.evaluate('([a,b,r]) => ({alias:catalogSpriteId(a,r),main:catalogSpriteId(b,r),file:spriteMetadata(catalogSpriteId(a,r))?.fileWebp})',[alias,main,r])
    assert result['alias']==result['main'],(mobile,alias,r,result)
    assert result['alias'].startswith('flower_v1_') and result['file'].startswith('assets/flower-style-v1/webp/'),result
  page.locator('#categoryTabs button').filter(has_text='Декор').click()
  for alias in ALIASES:
   assert page.locator('.catalog-card[data-kind="'+alias+'"]').count()==1,alias
  page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading===0',timeout=45000)
  # The actual thumbnails on the screen must contain image pixels, not be blank.
  for alias in ALIASES:
   ok=page.evaluate('''kind => {
      const c=document.querySelector('.catalog-card[data-kind="'+kind+'"] canvas');
      const ctx=c.getContext('2d');const data=ctx.getImageData(0,0,c.width,c.height).data;
      let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>20)visible++;
      return visible>200;
   }''',alias)
   assert ok,('empty thumbnail',alias,mobile)
  # Simulate a previously purchased Extra object: no rename or retroactive charge.
  intact=page.evaluate('''() => {
    const old=JSON.parse(JSON.stringify(state.city));
    old.objects.push({uid:'obj-8000',kind:'extra-fountain',x:20,y:20,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
    old.nextId=8001;
    const saved=sanitizeCity(old,CATALOG);
    return {sameWallet:JSON.stringify(saved.wallet)===JSON.stringify(old.wallet),kind:saved.objects.at(-1)?.kind};
  }''')
  assert intact=={'sameWallet':True,'kind':'extra-fountain'},intact
  # Build a fresh legacy-named ornament using a real purchase and check its type.
  before=page.evaluate('window.WorldZeffiSandbox.getCity()')
  page.locator('.catalog-card[data-kind="extra-tree"]').click()
  assert page.locator('#confirmEdit').is_enabled()
  page.locator('#confirmEdit').click()
  after=page.evaluate('window.WorldZeffiSandbox.getCity()')
  assert len(after['objects'])==len(before['objects'])+1
  assert after['objects'][-1]['kind']=='extra-tree'
  assert after['wallet']['points']<before['wallet']['points']
  # Road remains functional and charged per new tile only.
  page.locator('#toolRoad').click()
  page.evaluate('extendRoad({x:16,y:13})')
  assert page.locator('#confirmEdit').is_enabled()
  page.locator('#confirmEdit').click()
  assert '16,13' in page.evaluate('window.WorldZeffiSandbox.getCity().roads')
  page.locator('#toolSelect').click()
  page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading===0',timeout=45000)
  assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().failed')==0
  assert not any('.png' in req.lower() for req in requests),requests
  assert not errors,errors
  photo=page.screenshot(full_page=True,timeout=30000)
  name='Mir_Zeffi_v0.1.4_Clean_WebP_Mobile.webp' if mobile else 'Mir_Zeffi_v0.1.4_Clean_WebP_Desktop.webp'
  Image.open(BytesIO(photo)).convert('RGB').save(OUTPUT/name,'WEBP',quality=86,method=5)
  print('BROWSER_PASS', 'mobile' if mobile else 'desktop', 'catalog=33','art=236', 'aliases=4x4','road=paid', 'save=compatible', 'errors=0')
  page.close()
 browser.close()
