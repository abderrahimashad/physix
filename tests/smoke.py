"""Functional checks against an already running local static server."""
import os
from playwright.sync_api import sync_playwright

base = os.environ.get('PHYSIX_TEST_URL', 'http://127.0.0.1:8000')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    response = page.goto(base + '/?demo-admin=1')
    assert response.status == 200
    assert page.locator('#entry').is_visible()
    assert not page.locator('.app').is_visible()
    assert page.locator('.home-access button').count() == 2
    assert 'BIOF' not in page.locator('#entry').inner_text()
    assert page.locator('#entry main section').count() == 4
    assert 'Aperçu d’un chapitre' not in page.locator('#entry').inner_text()
    page.get_by_role('button', name='Espace Élève', exact=False).click()
    assert page.get_by_role('dialog').is_visible()
    assert page.get_by_role('button', name='Fermer').evaluate('(el)=>el===document.activeElement')
    page.keyboard.press('Escape')
    assert not page.get_by_role('dialog').is_visible()
    page.get_by_role('button', name='Espace Élève', exact=False).click()
    page.get_by_role('button', name='Ouvrir la démo élève').click()
    assert 'Mon accueil' in page.locator('#pagetitle').inner_text()
    assert page.locator('#nav button').filter(has_text='Professeur').count() == 0
    page.get_by_role('button', name='Accueil PhysiX').click()
    page.get_by_role('button', name='Accès Invité', exact=False).click()
    assert 'Modulation' in page.locator('#content').inner_text()
    assert 'Exercices — Mécanique' not in page.locator('#content').inner_text()
    # Exercise preserved fictional admin tools without exposing a public admin entrance.
    page.evaluate("setRole('prof')")
    page.locator('.classes button').nth(1).click()
    assert page.evaluate('cls') == '1BAC BIOF G1'
    page.get_by_role('button', name='Saisir les activités').click()
    page.locator('button[title="Participation"]').first.click()
    assert page.evaluate("state.students.find(s=>s.class===cls).participation") == 1
    page.reload()
    assert page.evaluate("state.students.find(s=>s.class==='1BAC BIOF G1').participation") == 1
    page.evaluate("document.getElementById('entry').classList.add('hidden');document.body.classList.remove('entry-open');setRole('prof');selectClass(1);go('activities')")
    page.get_by_role('button', name='Annuler la dernière action').click()
    assert page.evaluate("state.students.find(s=>s.class===cls).participation") == 0
    for role, targets in [('prof', ['dashboard','classes','activities','resources','stats','codes']), ('student', ['home','mycourses','myseries','myactivities','questions']), ('guest', ['guest','publiccourses','publicseries'])]:
        page.evaluate('(r)=>setRole(r)', role)
        for target in targets:
            page.evaluate('(t)=>go(t)', target)
            assert page.locator('#content').inner_text().strip()
    page.goto(base + '/admin.html')
    assert page.get_by_role('button', name='Connexion sécurisée').is_disabled()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(base)
    assert page.evaluate('document.getElementById("entry").scrollWidth <= innerWidth')
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.home-art img').evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
    assert not errors, errors
    browser.close()
    print('PASS: public access, admin URL regression, guest filtering, modal keyboard, 14 views, class selection, persistence/undo, admin placeholder, mobile and reduced motion')
