"""Approved landing: responsive layout, actions, and screenshot evidence."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
base = os.environ.get('PHYSIX_TEST_URL', 'http://127.0.0.1:8000')
out = Path(__file__).resolve().parents[1] / 'docs/screenshots'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width in [1440, 1200, 768, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.goto(base)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        assert page.locator('.home-art img').evaluate('(el)=>el.complete && el.naturalWidth>0')
        assert page.locator('.home-header button').count() == 1
        assert page.locator('.home-features article').count() == 4
        assert 'BIOF' not in page.locator('#entry').inner_text()
        assert page.locator('#entry').get_by_text('Aperçu d’un chapitre').count() == 0
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('.home-art img').evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
        if width in [1200, 390]:
            page.screenshot(path=str(out / f'accueil-officiel-{width}.png'), full_page=True)
    for action in ['about', 'contact', 'whatsapp', 'legal', 'demo']:
        page.locator(f'[data-home-action="{action}"]').first.click()
        assert page.locator('.home-dialog').is_visible()
        assert page.locator('#home-dialog-text').inner_text().strip()
        page.keyboard.press('Escape')
        assert not page.locator('.home-dialog').is_visible()
    page.locator('[data-home-action="demo"]').click()
    page.get_by_role('button', name='Explorer la démo élève').click()
    assert not page.locator('#entry').is_visible()
    assert 'Mon accueil' in page.locator('#pagetitle').inner_text()
    assert not errors, errors
    browser.close()
print('PASS: approved landing at five widths; artwork, 4 features, header, dialogs, demo, reduced motion; desktop/mobile screenshots')
