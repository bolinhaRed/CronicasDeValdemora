# Crónicas de Valdemora

RPG de exploração solitária em HTML, CSS e JavaScript puro. Sem frameworks, sem servidor, funciona sem internet depois da primeira visita (PWA).

## Publicar no GitHub Pages
1. Cria um repositório e envia todos os ficheiros desta pasta (exceto `dist/`, que é opcional).
2. Em *Settings → Pages*, escolhe o ramo `main` e a pasta `/ (root)`.
3. Abre o endereço no telemóvel e escolhe "Adicionar ao ecrã principal".

## Estrutura
- `js/rng.js` — gerador aleatório com semente (reprodutível).
- `js/data.js` — classes, objetos, monstros, textos e modelos de missão. **É aqui que se acrescenta conteúdo.**
- `js/gen.js` — gera o mapa, coloca a missão e valida que tudo é alcançável.
- `js/engine.js` — regras do jogo. Não toca na interface.
- `js/save.js` — gravação automática (localStorage), exportação e importação.
- `js/ui.js` — ecrãs, mapa (canvas com zoom e arrasto) e dado animado.
- `tools/teste.js` — testes automáticos (`node tools/teste.js`).
- `tools/build.py` — junta tudo num único `dist/cronicas.html`.

## Acrescentar uma missão
Copia um bloco de `CP.MISSOES` em `js/data.js` e muda o texto, o chefe, o objeto-chave, as três pistas e as soluções. Depois corre `node tools/teste.js` para confirmar que todas as masmorras geradas são completáveis.
