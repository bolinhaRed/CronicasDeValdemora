# Gera um único HTML autónomo (dist/cronicas.html) a partir dos ficheiros do projeto.
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
html = (R / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + (R / 'css/style.css').read_text(encoding='utf-8') + '\n</style>')
html = re.sub(r'<link rel="manifest"[^>]*>\n', '', html)
html = re.sub(r'<link rel="icon"[^>]*>', '', html)
def js(m): return '<script>\n' + (R / m.group(1)).read_text(encoding='utf-8') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
(R / 'dist').mkdir(exist_ok=True)
(R / 'dist/cronicas.html').write_text(html, encoding='utf-8')
print('dist/cronicas.html', len(html) // 1024, 'KB')
