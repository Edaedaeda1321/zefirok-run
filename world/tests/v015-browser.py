"""Browser acceptance for Mir Zeffi 0.1.5: progressive land, 1x1 bench and park stages."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
from io import BytesIO
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT.parent/'index.html').read_text(encoding='utf-8')
OUT=ROOT.parent/'screenshots_v015';OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    for mobile in (False,True):
        view={'width':390,'height':844} if mobile else {'width':1440,'height':940}
        page=browser.new_page(viewport=view,device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(HTML,wait_until='load',timeout=120000)
        page.locator('#welcomeStart').click(timeout=20000)
        assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().available')==236
        # Existing saved identity survives even if the footprint is narrowed.
        assert page.evaluate('CATALOG.bench.w===1&&CATALOG.bench.h===1&&CATALOG["extra-bench"].w===1')
        page.locator('.catalog-card[data-kind="bench"]').click()
        assert '1x1' in page.locator('#editSummary').inner_text()
        assert page.locator('#confirmEdit').is_enabled()
        page.locator('#confirmEdit').click()
        assert page.evaluate('state.city.objects.at(-1).kind')=='bench'
        # UI must recompute the next price AFTER EACH purchase, not just once.
        page.locator('#toolExpand').click()
        prices=[(1200,10),(2400,20),(4800,40),(9600,80),(19200,160)]
        for i,(points,treats) in enumerate(prices):
            summary=page.locator('#editSummary').inner_text().replace('\xa0','').replace(' ','')
            assert f'{points:,}'.replace(',','') in summary,(mobile,i,summary)
            assert str(treats) in summary,(mobile,i,summary)
            if i<4:
                # Add test currency before the last purchase (bench was bought first).
                if not page.locator('#confirmEdit').is_enabled():
                    page.locator('#topupWallet').click()
                before=page.evaluate('({...state.city.wallet})')
                page.locator('#confirmEdit').click()
                after=page.evaluate('({...state.city.wallet})')
                assert before['points']-after['points']==points,(before,after,points)
                assert before['treats']-after['treats']==treats,(before,after,treats)
                assert page.evaluate('state.city.parcels.length')==i+1
        # Stage art is aligned to real-world canvas and uses actual WebP at all angles.
        page.evaluate('''() => {
          const now=Date.now();let c=makeInitialCity();
          const placements=[['garden',16,16],['playground',20,16],['fountain',16,20],['monument',19,20],['bench',20,19]];
          for(const [kind,x,y] of placements)c=addObject(c,CATALOG,kind,x,y,0,now);
          state.city=c;state.mode='select';state.selectedUid=null;state.draft=null;state.expansionDraft=null;
          focusOnTile(18.8,18.2);updateUI();scheduleDraw();
        }''')
        assert page.evaluate('state.city.objects.filter(i=>i.buildReadyAt>Date.now()).length')==4
        for stage,progress in [(1,0.08),(2,0.49),(3,0.85)]:
            page.evaluate('''(progress) => {
              const now=Date.now();
              for(const item of state.city.objects){
                const duration=CATALOG[item.kind]?.buildMs||0;
                if(duration>0 && item.buildReadyAt>0){
                  item.buildStartedAt=now-Math.round(duration*progress);
                  item.buildReadyAt=item.buildStartedAt+duration;
                }
              }
              updateUI();scheduleDraw();
            }''',progress)
            # Initiate all asset fetches including rotated sprites and wait for decoding.
            page.evaluate('''() => {
              const ctx=document.createElement('canvas').getContext('2d');
              for(const a of SPRITE_MANIFEST.assets.filter(a=>a.packId==='park-construction-v1'))drawSprite(ctx,a.id,{x:400,y:400});
            }''')
            page.wait_for_function('() => window.WorldZeffiSandbox.getArtStatus().loading===0',timeout=90000)
            assert page.evaluate('window.WorldZeffiSandbox.getArtStatus().failed')==0
            page.wait_for_timeout(120)
            file=OUT/f"{'mobile' if mobile else 'desktop'}_stage{stage}.webp"
            shot=page.screenshot(timeout=60000)
            Image.open(BytesIO(shot)).convert('RGB').save(file,'WEBP',quality=86,method=4)
        before=Image.open(OUT/f"{'mobile' if mobile else 'desktop'}_stage1.webp").convert('RGB')
        after=Image.open(OUT/f"{'mobile' if mobile else 'desktop'}_stage3.webp").convert('RGB')
        diff=ImageChops.difference(before,after)
        bbox=diff.getbbox()
        assert bbox is not None,(mobile,'construction images did not change')
        # Rotated versions resolve without any identical sprite ID reuse.
        assert page.evaluate('''() => ['garden','playground','fountain','monument'].every(kind=>new Set([0,1,2,3].map(r=>parkConstructionAssetId(kind,r,'build_02'))).size===4)''')
        assert not errors,(mobile,errors)
        print('BROWSER_PASS','mobile' if mobile else 'desktop','land=1x2x4x8','bench=1x1','new-stages=48','decoded=true','errors=0')
        page.close()
    browser.close()
