"""Offline browser smoke suite: use the full Core Pack single-file preview."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT.parent/'world-v01-preview.html').read_text(encoding='utf-8')

def run(width,height,filename):
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_timeout(250)
        print('viewport',width,height,'errors',errors,'catalog',page.locator('.catalog-card').count())
        print('stats',page.evaluate('window.WorldZeffiSandbox && window.WorldZeffiSandbox.getStats()'))
        print('welcome visible',page.locator('#welcomeModal').is_visible())
        page.locator('#welcomeStart').click()
        page.wait_for_timeout(100)
        page.screenshot(path=str(ROOT.parent/filename),full_page=True)
        browser.close()
        assert not errors,errors
        return True

if __name__=='__main__':
 run(390,844,'mobile-initial.png')
 run(1280,850,'desktop-initial.png')
