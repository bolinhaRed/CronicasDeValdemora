# Crónicas de Valdemora

RPG de exploração solitária, em expedições curtas de 5 a 15 minutos. Escolhes uma missão, desces a uma cripta, mina ou ruína, investigas, resolves o mistério e voltas à aldeia. O mundo lembra-se do que fizeste.

**▶ Jogar agora:** https://bolinhared.github.io/CronicasDeValdemora/

## Características
- **Masmorras geradas em cada expedição**, com nevoeiro de guerra, portas trancadas, passagens secretas, armadilhas e uma câmara oculta com enigma.
- **Mistérios coerentes:** o culpado, as pistas e as soluções ficam definidos antes de entrares. Cada missão pode resolver-se pela força ou de forma pacífica.
- **Dados por personagem:** cada atributo é um dado, de d4 a d12. Precisas de 4 ou mais, e subir de nível melhora o dado.
- **Quatro classes:** Guerreiro, Ladrão, Explorador e Místico, cada uma com uma forma diferente de jogar.
- **Mundo persistente:** reputação nas aldeias, missões que desbloqueiam novas regiões, personagens e locais que mudam com as tuas escolhas.
- **Relógio de Perigo:** o barulho e as falhas atraem criaturas errantes.
- **Música ambiente, efeitos sonoros e efeitos visuais.**
- **Gravação automática**, com exportação e importação de campanhas.

## Instalar no telemóvel
Abre o link no navegador e escolhe **"Adicionar ao ecrã principal"**. Depois da primeira visita, o jogo funciona sem internet.

## Como jogar
- Toca numa sala conhecida do mapa para ires até lá. Arrasta para mover e usa dois dedos ou os botões **+ / −** para o zoom.
- As ações disponíveis aparecem por baixo da narrativa.
- Para guardares o que encontraste, sai pela entrada. A masmorra fica como a deixaste.
- No **Menu** podes desistir de uma masmorra, ligar ou desligar o som e a música, exportar a campanha ou começar uma nova.

## Estrutura do projeto
| Ficheiro | Função |
|---|---|
| `js/data.js` | Classes, objetos, monstros, textos e missões. **Para acrescentar conteúdo, é aqui.** |
| `js/gen.js` | Geração e validação das masmorras |
| `js/engine.js` | Regras do jogo (separadas da interface) |
| `js/ui.js` | Ecrãs, mapa, dados animados e efeitos |
| `js/fichas.js` | Fichas do herói, das criaturas e marcadores do mapa |
| `js/sfx.js` / `js/musica.js` | Efeitos sonoros e música |
| `js/save.js` | Gravação local, exportação e importação |
| `tools/teste.js` | Testes automáticos (`node tools/teste.js`) |

Feito em HTML, CSS e JavaScript puro, sem frameworks nem servidor.

## Créditos
- **Música:**
  - "The Longest Journey", de nakaradaalexander;
  - "D&D Acoustic Loop", de ebunny;
  - "The Ancient Temple", de Tim Kulig.
- **Sprites de pixel art:** do projeto Mestre da Masmorra.
