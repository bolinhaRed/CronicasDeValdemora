# Gera js/kit.js com os sprites do "Free Top-Down Roguelike Game Kit" (CraftPix), embutidos.
# Uso: python3 tools/kit.py /caminho/para/o/kit/descompactado
import base64, json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
from PIL import Image
import io
def u2(p):  # volta a gravar o PNG sem metadados (os originais trazem ~15 KB de lixo cada)
    buf = io.BytesIO(); Image.open(p).convert('RGBA').save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
K = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/zc')
uri = lambda p: u2(K / p)
ANIMS = [d + '_' + a for d in 'DSU' for a in ('Idle', 'Walk', 'Attack', 'Hurt', 'Death')]
kit = {'tileset': uri('2 Dungeon Tileset/1 Tiles/Tileset.png'), 'sombra': uri('1 Characters/Other/Shadow.png'),
       'sangue': uri('3 Dungeon Enemies/Other/D_Blood.png'), 'chars': {}}
for n in '123': kit['chars']['h' + n] = {a: uri(f'1 Characters/{n}/{a}.png') for a in ANIMS}
for n in '1234': kit['chars']['e' + n] = {a: uri(f'3 Dungeon Enemies/{n}/{a}.png') for a in ANIMS}
A = '2 Dungeon Tileset/3 Animated objects/'
kit['anim'] = {k: uri(A + f + '.png') for k, f in {'portaH': 'Door_D', 'portaV': 'Door_S', 'bau': 'Chest1_D', 'alavanca': 'Lever1', 'espigoes': 'Spikes', 'fogo': 'Fire1'}.items()}
O = '2 Dungeon Tileset/2 Objects/'
grupos = {
  'tocha': ['Torches/1'], 'grades': ['Other/11'], 'ralo': ['Other/12'], 'velas': ['Other/21', 'Other/22', 'Other/23', 'Other/24'],
  'barril': ['Other/27', 'Other/28', 'Other/29', 'Other/30'], 'saco': ['Other/32', 'Other/33', 'Other/34'], 'armas': ['Other/35', 'Other/36'],
  'caixa': [f'Boxes/{i}' for i in range(1, 9)], 'pote': [f'Boxes/{i}' for i in range(12, 16)], 'estante': [f'Bookshelf/{i}' for i in range(5, 13)],
  'mesa': ['Tables/1', 'Tables/2'], 'mesaV': ['Tables/5', 'Tables/6'], 'madeira': [f'Blockage/{i}' for i in range(1, 5)], 'pedras': [f'Blockage/{i}' for i in range(5, 9)],
  'moedas': ['Other/19', 'Other/20']
}
kit['obj'] = {g: [uri(O + f + '.png') for f in fs] for g, fs in grupos.items()}
# --- outros pacotes da CraftPix (personagens de perfil, aldeia, livro mágico, ícones de feitiços) ---
F = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/p749505')   # Medieval Fortress
I = pathlib.Path(sys.argv[3] if len(sys.argv) > 3 else '/tmp/p351300')   # Island Adventure
Z = pathlib.Path(sys.argv[4] if len(sys.argv) > 4 else '/tmp/p794432')   # Urban Zombie
B = pathlib.Path(sys.argv[5] if len(sys.argv) > 5 else '/tmp/p809047')   # Magic Book

def perfil(pasta, nomes):
    out = {}
    for a, cands in nomes.items():
        for c in cands:
            f = pathlib.Path(pasta) / (c + '.png')
            if f.exists(): out[a] = u2(f); break
    return out
NOMES = {'Idle': ['Idle'], 'Walk': ['Walk', 'Run'], 'Attack': ['Attack_1', 'Attack', 'Idle'], 'Hurt': ['Hart'], 'Death': ['Dead']}
kit['perfil'] = {
  'ninja': perfil(Z / 'Characters/Character_3', NOMES), 'zombi1': perfil(Z / 'Enimies/Enimies_1', NOMES), 'zombi3': perfil(Z / 'Enimies/Enimies_3', NOMES),
  'caranguejo': perfil(I / 'Characters/Character_4', NOMES), 'raposa': perfil(I / 'Characters/Character_6', NOMES),
  'alabardeiro': perfil(F / 'Characters/Character_4', NOMES), 'cavaleiro': perfil(F / 'Characters/Character_8', NOMES),
  'guarda': perfil(F / 'Characters/Character_5', NOMES), 'aldea': perfil(I / 'Characters/Character_1', NOMES), 'aldeao': perfil(I / 'Characters/Character_2', NOMES)
}
# aldeia: recortes do tileset da fortaleza (x0, y0, x1, y1) e animações
from PIL import Image
import io
fort = Image.open(F / 'Tileset/Tiled_Map.png').convert('RGBA')
def recorte(b):
    buf = io.BytesIO(); fort.crop(b).save(buf, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
kit['aldeia'] = {n: recorte(b) for n, b in {
  'relva': (184, 244, 200, 260), 'terra': (244, 195, 260, 211), 'muro': (168, 176, 200, 224), 'arco': (160, 16, 192, 48), 'porta': (96, 128, 128, 160),
  'arvore1': (160, 49, 192, 94), 'arvore2': (193, 65, 223, 96), 'arvore3': (224, 72, 240, 95), 'pinheiros': (241, 48, 288, 96),
  'cerca1': (160, 113, 181, 144), 'cerca2': (192, 129, 208, 144), 'barril': (256, 139, 272, 160), 'caixa': (256, 107, 272, 128), 'saco': (224, 112, 240, 128),
  'flor1': (212, 164, 221, 173), 'flor2': (227, 164, 236, 171), 'flor3': (257, 163, 270, 173), 'pedra1': (208, 19, 224, 31), 'pedra2': (247, 22, 268, 40)}.items()}
kit['aldeia_anim'] = {'fogueira': u2(F / 'Tileset/Fire.png'), 'tocha': u2(F / 'Tileset/Torch.png')}
kit['livro'] = u2(B / 'PNG/Open_book.png')
kit['feitico'] = {n: u2(B / f'PNG/Icons/Icon{n}_big.png') for n in (1, 2, 3, 4, 14, 15, 16, 17, 20)}

# --- bestiário 16x16 ("Basic Asset Pack"): só animação de espera, 4 fotogramas ---
BAP = pathlib.Path(sys.argv[6] if len(sys.argv) > 6 else '/tmp/bap')
MINI = {'ossos': 'Decrepit Bones', 'ghoul': 'Sand Ghoul', 'cadaver': 'Bound Cadaver', 'morcego': 'Vampire Bat', 'necromante': 'adept necromancer',
        'arconte': 'Sword Archon', 'lobo': 'Timber Wolf', 'javali': 'Mad Boar', 'formiga': 'Soldier Ant', 'formigaLava': 'Lava Ant', 'besouro': 'Rhino Beetle',
        'goblin': 'goblin fighter', 'goblinChefe': 'goblin fanatic', 'assassino': 'halfling assassin', 'vilao': 'Depraved Blackguard',
        'pastor': 'Gentle Shepard', 'clerigo': 'Favored Cleric', 'ovelha': 'Pasturing Sheep', 'galinha': 'Clucking Chicken', 'ganso': 'Honking Goose', 'porco': 'Dainty Pig'}
kit['mini'] = {}
for k2, n in MINI.items():
    f = next(q for q in sorted(BAP.rglob('*.png')) if q.parent.name.lower() == n.lower() and 'animations' in str(q).lower())
    kit['mini'][k2] = u2(f)

# --- retratos (Free 39 Portraits, CraftPix) e interface (Humble Gift, Humble Pixel) ---
FP = pathlib.Path(sys.argv[7] if len(sys.argv) > 7 else '/tmp/fp')
HG = pathlib.Path(sys.argv[8] if len(sys.argv) > 8 else '/tmp/hg/Humble Gift - v1.3/PNG/SpriteSheet.png')
RET = {'aldeoes': '16', 'frei': '13', 'goncalo': '15', 'mercador': '03', 'prisioneiro': '17', 'ferido': '18', 'mimico': '20',
       'lobo': '06', 'goblin': '08', 'gorm': '10', 'esqueleto': '24', 'javali': '35', 'besouro': '29', 'rasca': '01', 'bandido': '32',
       'ghoul': '22', 'bertolo': '22', 'morcego': '11', 'cassio': '25', 'guardiao': '34',
       'bras': '36', 'brigida': '02', 'tome': '33', 'mensageiro': '14', 'alfa': '06'}
kit['retratos'] = {k: u2(FP / f'2 Portraits with back/Icons_{n}.png') for k, n in RET.items()}
hg = Image.open(HG).convert('RGBA')
def corte(b):
    buf = io.BytesIO(); hg.crop(b).save(buf, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
kit['ui'] = {n: corte(b) for n, b in {
  'painel': (32, 128, 189, 193), 'botao': (52, 1557, 109, 1579), 'botao2': (132, 1557, 189, 1577), 'slot': (40, 550, 73, 586),
  'estrela': (552, 232, 568, 248), 'gema': (584, 232, 600, 248), 'livro': (624, 145, 640, 160), 'erva': (592, 177, 608, 192), 'pena': (657, 176, 672, 191)}.items()}

txt = ('/* Crónicas de Valdemora — sprites da CraftPix.net: Top-Down Roguelike, Medieval Fortress, Island Adventure, Urban Zombie e Magic Book; bestiário 16x16 "Basic Asset Pack".\n'
       '   Embutidos aqui porque a licença não permite redistribuir os ficheiros soltos. Gerado por tools/kit.py. */\n'
       '(function (G) {\n  (G.CP = G.CP || {}).KIT = ' + json.dumps(kit) + ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n')
(R / 'js/kit.js').write_text(txt)
print('js/kit.js', len(txt) // 1024, 'KB')
