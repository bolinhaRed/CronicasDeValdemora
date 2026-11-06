# Gera um único HTML autónomo (dist/cronicas.html) a partir dos ficheiros do projeto.
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
html = (R / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + (R / 'css/style.css').read_text(encoding='utf-8') + '\n</style>')
html = re.sub(r'<link rel="manifest"[^>]*>\n', '', html)
html = re.sub(r'<link rel="icon"[^>]*>', '', html)
import base64, json
def js(m):
    if m.group(1) == 'js/musica-src.js':
        src = {k: 'data:audio/mpeg;base64,' + base64.b64encode((R / f'audio/{k}.mp3').read_bytes()).decode() for k in ('inicio', 'aldeia', 'masmorra')}
        return '<script>\n(window.CP = window.CP || {}).MUSICA_SRC = ' + json.dumps(src) + ';\n</script>'
    return '<script>\n' + (R / m.group(1)).read_text(encoding='utf-8') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
(R / 'dist').mkdir(exist_ok=True)
(R / 'dist/cronicas.html').write_text(html, encoding='utf-8')
print('dist/cronicas.html', len(html) // 1024, 'KB')
