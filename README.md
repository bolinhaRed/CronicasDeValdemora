# Crónicas de Valdemora

RPG de exploração solitária em HTML, CSS e JavaScript puro. Sem frameworks, sem servidor, funciona sem internet depois da primeira visita (PWA).

 https://bolinhared.github.io/CronicasDeValdemora/

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

## Música
- `audio/inicio.mp3` — "The Longest Journey" (nakaradaalexander), no ecrã inicial.
- `audio/aldeia.mp3` — "D&D Acoustic Loop" (ebunny), na aldeia.
- `audio/masmorra.mp3` — "The Ancient Temple" (Tim Kulig), dentro das masmorras.

As faixas foram comprimidas (mono, 48 kbps) para o jogo ficar leve. Confirma a licença de cada uma na página de origem antes de publicar.

## Sprites, retratos e ícones
- Masmorra, personagens, criaturas, aldeia, livro de pistas e ícones de feitiços: pacotes gratuitos da CraftPix.net (Top-Down Roguelike, Medieval Fortress, Island Adventure, Urban Zombie Survival e Animated Magic Book), embutidos em `js/kit.js` (gerado por `tools/kit.py`).
- Retratos: "RPG Character Portraits" (Gen XIA). Ícones: "Objects" (Geloz Games).
- Estão embutidos em `js/retratos.js` (gerado por `tools/assets.py`), porque as licenças não permitem redistribuir os ficheiros soltos.
