"""Capture the phase 1 demonstration and check responsive enhancements."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get('PHYSIX_TEST_URL', 'http://127.0.0.1:8000')
out = Path(__file__).resolve().parents[1] / 'docs/screenshots'
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.emulate_media(reduced_motion='reduce')
    for width in [1440, 768, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.goto(base)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        assert page.locator('.science-scene img').evaluate('(el)=>el.complete && el.naturalWidth>0')
        assert page.locator('#entry').inner_text().count('Espace Élève') == 1
        assert page.locator('#entry').inner_text().count('Accès Invité') == 1
        if width in [1440, 390]:
            page.screenshot(path=str(out / f'accueil-{width}.png'), full_page=True)
    page.set_viewport_size({'width':1440, 'height':1000})
    page.get_by_role('button', name='Espace Élève').click()
    page.get_by_role('button', name='Ouvrir la démo élève').click()
    page.screenshot(path=str(out / 'espace-eleve-demo.png'), full_page=True)
    page.emulate_media(reduced_motion='no-preference')
    page.goto(base)
    page.locator('#why-heading').scroll_into_view_if_needed()
    page.wait_for_function("!document.querySelector('.why-section').classList.contains('pending')")
    page.locator('.science-scene').scroll_into_view_if_needed()
    page.locator('.science-scene').hover()
    page.wait_for_function("document.querySelector('.science-scene').style.getPropertyValue('--tilt-x') !== ''")
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.science-scene').evaluate('(el)=>getComputedStyle(el).transform') == 'none'
    browser.close()
print('PASS: 4 viewport sizes, SVG, scroll reveal, parallax, reduced motion; 3 screenshots saved')
