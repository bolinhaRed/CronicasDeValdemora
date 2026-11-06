# Teste da interface no navegador (formato telemóvel): python3 tools/ui_teste.py [ficheiro]
from playwright.sync_api import sync_playwright
import sys, pathlib
alvo = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
url = 'file://' + str(pathlib.Path(alvo).resolve())
erros = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for n in (192, 512):
        pg = b.new_page(viewport={'width': n, 'height': n})
        pg.set_content(f'<body style="margin:0">{open("icon.svg").read().replace("<svg ", "<svg width=%d height=%d " % (n, n))}</body>')
        pg.screenshot(path=f'icon-{n}.png'); pg.close()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and 'ERR_NAME' not in m.text else None)
    pg.goto(url); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/s1_criar.png')
    pg.fill('#in-nome', 'Inês'); pg.click('[data-classe=ladrao]'); pg.click('#bt-comecar'); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/s2_aldeia.png', full_page=True)
    pg.click('[data-partir]')
    def esperar():
        for _ in range(200):
            if pg.locator('#ecra-exp').is_hidden(): return
            if pg.locator('#acoes button:not([disabled])').count(): return
            try: pg.click('#narr', force=True, timeout=300)
            except Exception: pass
            pg.wait_for_timeout(50)
    esperar(); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/s3_exp.png')
    pri = ['Devolver', 'Mostrar', 'Pegar', 'Oferecer', 'Colocar', 'Atacar', 'Apanhar', 'Premir', 'Ler', 'Investigar', 'Seguir', 'Arrombar', 'Abrir', 'Regressar']
    tirou = 0
    for passo in range(160):
        if pg.locator('#ecra-exp').is_hidden(): break
        bts = pg.locator('#acoes button:not([disabled])')
        rot = [bts.nth(i).inner_text() for i in range(bts.count())]
        if not rot: esperar(); continue
        esc = next((i for pf in pri for i, r in enumerate(rot) if r.startswith(pf)), 0)
        if rot[esc].startswith('Atacar') and not tirou:
            bts.nth(esc).click(); pg.wait_for_timeout(450); pg.screenshot(path='/tmp/s4_dado.png'); tirou = 1
            pg.wait_for_timeout(1400); pg.screenshot(path='/tmp/s5_combate.png')
        else:
            try: bts.nth(esc).click(timeout=1500)
            except Exception: pass
        esperar()
    pg.wait_for_timeout(600)
    pg.screenshot(path='/tmp/s6_fim.png', full_page=True)
    if pg.evaluate("JSON.parse(localStorage.getItem('cronicas-profundezas.v1')).ecra") == 'expedicao':
        print(pg.evaluate("()=>{const st=JSON.parse(localStorage.getItem('cronicas-profundezas.v1'));return {acoes:CP.Engine.acoes(st).map(a=>a.rotulo),obj:st.exp.objetivo,descob:st.exp.d.salas.filter(s=>s.estado==='descoberta').map(s=>s.id),sala:st.exp.sala}}"))
    print('ecrã final:', pg.evaluate("JSON.parse(localStorage.getItem('cronicas-profundezas.v1')).ecra"), 'passos', passo)
    b.close()
print('erros:', erros[:10])
