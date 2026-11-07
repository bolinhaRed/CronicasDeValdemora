# Gera js/retratos.js com os retratos e ícones usados (embutidos, para não ficarem soltos no repositório).
import base64, json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
RET = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/zb/png/1x')
OBJ = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path('/tmp/za/Object/objects')
uri = lambda p: 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
EXP = ['neutral', 'happy', 'angry', 'hurt', 'sad', 'surprised']
ret = {}
for c in ['warrior', 'rogue', 'ranger', 'mage', 'skeleton', 'goblin', 'wolf', 'slime']:
    ret[c] = {e: uri(RET / f'{c}-{e}.png') for e in EXP}
for c in ['merchant', 'cleric', 'knight', 'bard']:
    ret[c] = {e: uri(RET / f'{c}-{e}.png') for e in ['neutral', 'happy', 'sad']}
objs = ['potion', 'key', 'lantern', 'shield', 'sword', 'axe', 'knife', 'rod', 'diamond', 'ruby', 'crown', 'purpleHeart', 'money',
        'purse', 'book', 'candle', 'parchment', 'bone', 'padlock', 'horn', 'wall', 'compass', 'hourglass', 'star', 'heart', 'treasureMap', 'pickaxe', 'dice']
from PIL import Image
import io
def recortado(p):
    # corta a margem transparente e centra num quadrado, para o ícone ocupar o espaço todo
    im = Image.open(p).convert('RGBA'); bb = im.getbbox(); im = im.crop(bb)
    n = max(im.size) + 2; q = Image.new('RGBA', (n, n), (0, 0, 0, 0)); q.paste(im, ((n - im.width) // 2, (n - im.height) // 2))
    b = io.BytesIO(); q.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
obj = {o: recortado(OBJ / f'artefact-{o}.png') for o in objs}
txt = ('/* Crónicas de Valdemora — retratos (RPG Character Portraits, Gen XIA) e ícones (Zroth Objects, Geloz Games).\n'
       '   Embutidos aqui de propósito: as licenças não permitem redistribuir os ficheiros soltos. */\n'
       '(function (G) {\n  const CP = G.CP = G.CP || {};\n  CP.RET = ' + json.dumps(ret) + ';\n  CP.OBJ = ' + json.dumps(obj) + ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n')
(R / 'js/retratos.js').write_text(txt)
print('js/retratos.js', len(txt) // 1024, 'KB')
