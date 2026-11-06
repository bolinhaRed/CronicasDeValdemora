/* Crónicas de Valdemora — dados (sem lógica).
   Para acrescentar conteúdo, basta editar este ficheiro. */
(function (G) {
  const CP = G.CP = G.CP || {};

  CP.MOCHILA = 6; // espaços de inventário

  // Cada atributo é um dado: 0 = d4, 1 = d6, 2 = d8, 3 = d10, 4 = d12
  CP.DADOS = [4, 6, 8, 10, 12];

  CP.ATRIB = { forca: 'Força', agilidade: 'Agilidade', astucia: 'Astúcia', espirito: 'Espírito' };

  /* ---------- Classes ---------- */
  CP.CLASSES = {
    guerreiro: {
      nome: 'Guerreiro', pv: 10,
      attrs: { forca: 2, agilidade: 0, astucia: 0, espirito: 1 },
      arma: 'espada', armadura: 'cota', mochila: ['pocao'],
      desc: 'Aguenta golpes e acerta com força. Fúria: repete um ataque falhado em cada combate.'
    },
    ladrao: {
      nome: 'Ladrão', pv: 7,
      attrs: { forca: 0, agilidade: 2, astucia: 1, espirito: 0 },
      arma: 'punhal', armadura: 'gibao', mochila: ['pocao', 'gazua'],
      desc: 'Vantagem em fechaduras, armadilhas e furtividade. O ataque furtivo causa dano a dobrar.'
    },
    explorador: {
      nome: 'Explorador', pv: 8,
      attrs: { forca: 1, agilidade: 0, astucia: 2, espirito: 0 },
      arma: 'machado', armadura: 'gibao', mochila: ['pocao', 'oleo'],
      desc: 'Vantagem a investigar. Deteta sempre as armadilhas e pressente criaturas atrás das portas.'
    },
    mistico: {
      nome: 'Místico', pv: 7,
      attrs: { forca: 0, agilidade: 0, astucia: 1, espirito: 2 },
      arma: 'cajado', armadura: 'manto', mochila: ['pocao'], rituais: 3,
      desc: 'Lê inscrições antigas sem esforço. Três rituais por expedição: Luz, Cura e Banir mortos-vivos.'
    }
  };

  /* ---------- Objetos ---------- */
  CP.ITENS = {
    // armas (attr = atributo usado no ataque)
    espada: { nome: 'Espada', tipo: 'arma', atk: 0, dano: 2, attr: 'forca', preco: 10 },
    espadalonga: { nome: 'Espada longa', tipo: 'arma', atk: 1, dano: 2, attr: 'forca', preco: 22 },
    punhal: { nome: 'Punhal', tipo: 'arma', atk: 0, dano: 1, attr: 'agilidade', preco: 4 },
    punhalfino: { nome: 'Punhal de aço fino', tipo: 'arma', atk: 1, dano: 2, attr: 'agilidade', preco: 20 },
    machado: { nome: 'Machado de mão', tipo: 'arma', atk: 0, dano: 2, attr: 'forca', preco: 8 },
    cajado: { nome: 'Cajado', tipo: 'arma', atk: 0, dano: 1, attr: 'espirito', preco: 2 },
    cajadorunico: { nome: 'Cajado de Varro', tipo: 'arma', atk: 1, dano: 2, attr: 'espirito', preco: 20 },
    // proteção
    manto: { nome: 'Manto acolchoado', tipo: 'armadura', def: 1, preco: 4 },
    gibao: { nome: 'Gibão de couro', tipo: 'armadura', def: 1, preco: 6 },
    cota: { nome: 'Cota de malha', tipo: 'armadura', def: 2, preco: 25 },
    escudo: { nome: 'Escudo', tipo: 'escudo', def: 1, preco: 12 },
    // consumíveis e ferramentas
    pocao: { nome: 'Poção de cura', tipo: 'consumivel', cura: 4, preco: 5, desc: 'Recupera 4 PV.' },
    gazua: { nome: 'Gazuas', tipo: 'ferramenta', preco: 4, desc: 'Permitem forçar fechaduras.' },
    oleo: { nome: 'Frasco de óleo', tipo: 'consumivel', preco: 3, desc: 'Arde depressa. Em combate, causa 2 de dano.' },
    // tesouros (vendem-se na aldeia)
    broche: { nome: 'Broche esmaltado', tipo: 'tesouro', valor: 6 },
    calice: { nome: 'Cálice de prata', tipo: 'tesouro', valor: 8 },
    anel: { nome: 'Anel de ouro', tipo: 'tesouro', valor: 12 },
    idolo: { nome: 'Ídolo de jade', tipo: 'tesouro', valor: 20 },
    // objetos de missão
    badalo: { nome: 'Badalo de bronze', tipo: 'missao', desc: 'Um badalo de sino partido, com o nome BERTOLO gravado.' },
    diario: { nome: 'Diário de Varro', tipo: 'missao', desc: 'Última página: «Cássio não está pronto. O sino chama mais do que ele aguenta.»' },
    pepita: { nome: 'Pepita de prata', tipo: 'missao', valor: 10, desc: 'Do tamanho de um ovo. Qualquer goblin a cobiçaria.' },
    recibo: { nome: 'Recibo do penhorista', tipo: 'missao', desc: 'Um recibo de Pedra-Funda, assinado por um tal Rasca.' },
    pedra: { nome: 'Pedra do altar', tipo: 'missao', desc: 'Uma pedra lavrada, com um encaixe gasto.' }
  };

  CP.LOJA = ['pocao', 'gazua', 'oleo', 'gibao', 'escudo', 'cota', 'espadalonga', 'punhalfino'];

  /* ---------- Monstros ---------- */
  // atk: dificulta a tua defesa · def: dificulta o teu ataque
  CP.MONSTROS = {
    rato: { nome: 'Rato gigante', pv: 2, atk: 0, def: 0, dano: 1 },
    esqueleto: { nome: 'Esqueleto', pv: 3, atk: 0, def: 0, dano: 1, morto: true },
    ghoul: { nome: 'Ghoul', pv: 4, atk: 1, def: 0, dano: 2, morto: true },
    aranha: { nome: 'Aranha gigante', pv: 3, atk: 0, def: 1, dano: 1 },
    goblin: { nome: 'Goblin', pv: 2, atk: 0, def: 0, dano: 1 },
    lobo: { nome: 'Lobo', pv: 3, atk: 1, def: 0, dano: 1 },
    bandido: { nome: 'Bandido', pv: 3, atk: 0, def: 0, dano: 1 },
    bertolo: { nome: 'Bertolo, o sineiro', pv: 6, atk: 1, def: 0, dano: 2, morto: true },
    cassio: { nome: 'Cássio, aprendiz de necromante', pv: 5, atk: 1, def: 1, dano: 2 },
    maearanha: { nome: 'Mãe-aranha', pv: 7, atk: 1, def: 1, dano: 2 },
    gorm: { nome: 'Gorm, chefe goblin', pv: 6, atk: 1, def: 0, dano: 2 },
    rasca: { nome: 'Rasca, o salteador', pv: 6, atk: 0, def: 1, dano: 2 },
    guardiao: { nome: 'Guardião espectral', pv: 6, atk: 1, def: 1, dano: 2, morto: true }
  };

  /* ---------- Tipos de masmorra ---------- */
  CP.TIPOS = {
    cripta: {
      nome: 'Cripta',
      salas: ['Ossário', 'Capela funerária', 'Galeria de nichos', 'Câmara dos sarcófagos', 'Sacristia', 'Cripta lateral', 'Átrio das lápides'],
      descs: ['Nichos com ossadas alinhadas até ao teto.', 'O ar cheira a cera velha e a terra molhada.', 'Um sarcófago partido, com a tampa no chão.',
        'Raízes atravessam a abóbada e pingam água.', 'Restos de um altar cobertos de pó cinzento.', 'Paredes cheias de nomes riscados à faca.',
        'Um frio húmido sobe do chão de pedra.'],
      monstros: ['esqueleto', 'esqueleto', 'rato', 'ghoul'],
      armadilha: { nome: 'laje solta', txt: 'Uma laje cede e saltam dardos das paredes.', dano: 2 },
      presagio: 'As chamas tremem todas ao mesmo tempo. Algo se mexe nas profundezas.'
    },
    mina: {
      nome: 'Mina',
      salas: ['Galeria escorada', 'Poço de extração', 'Armazém de ferramentas', 'Veio esgotado', 'Câmara inundada', 'Forja abandonada', 'Cruzamento de carris'],
      descs: ['Vigas podres seguram o teto a custo.', 'Carris enferrujados perdem-se na escuridão.', 'A água escorre pelas paredes e junta-se em poças negras.',
        'Picaretas partidas e um carrinho virado.', 'O eco dos teus passos volta atrasado.', 'Há pó de pedra suspenso no ar.', 'Uma lamparina partida pende de um gancho.'],
      monstros: ['aranha', 'goblin', 'rato', 'goblin'],
      armadilha: { nome: 'teto instável', txt: 'Uma viga estala e cai uma chuva de pedras.', dano: 2 },
      presagio: 'Cai pó do teto. Algo grande desloca-se nos túneis.'
    },
    ruinas: {
      nome: 'Ruínas',
      salas: ['Salão desabado', 'Claustro', 'Torre caída', 'Refeitório', 'Pátio interior', 'Biblioteca queimada', 'Capela sem teto'],
      descs: ['Metade do teto caiu; vês o céu cinzento.', 'A hera cobre as colunas partidas.', 'Um fogão de pedra, frio há décadas.',
        'Estantes carbonizadas e páginas a esvoaçar.', 'O musgo grosso abafa os teus passos.', 'Uma estátua sem cabeça vigia a porta.', 'Vidros de cor partidos brilham no chão.'],
      monstros: ['bandido', 'lobo', 'esqueleto', 'rato'],
      armadilha: { nome: 'chão podre', txt: 'O soalho cede e cais num buraco de pedras.', dano: 2 },
      presagio: 'Um uivo corta o silêncio. Já sabem que estás aqui.'
    }
  };

  CP.NOTAS = [
    '«Se leres isto, não durmas aqui.»',
    '«Três dias sem luz. A tocha acabou.»',
    '«Deixei o ouro. Levem-no vocês.»',
    '«Não confies nas portas que rangem.»',
    '«Diz à minha irmã que tentei.»'
  ];

  CP.INSCRICOES = [
    'Uma oração gasta pede silêncio a quem passa.',
    'Uma lista de nomes, e uma data que já ninguém lembra.',
    'Um aviso: «Aqui termina a luz.»',
    'Versos sobre um rei que dormia debaixo da terra.'
  ];

  CP.SIMBOLOS = ['Sol', 'Lua', 'Corvo'];

  /* ---------- Locais da região ---------- */
  CP.LOCAIS = {
    corvamonte: {
      nome: 'Corvamonte',
      desc: 'Aldeia de pastores encostada à serra. Fumo nas chaminés, lama nas ruas.',
      ecos: {
        bertolo_descansa: 'Marta voltou a levar velas à cripta, agora para um túmulo fechado.',
        bertolo_destruido: 'As galinhas voltaram a dormir sossegadas.',
        cassio_poupado: 'Cássio trabalha na forja, de cabeça baixa. Vende-te o cajado do antigo mestre.',
        cassio_morto: 'Ainda se fala do jovem que tocava sinos aos mortos.',
        reliquia_devolvida: 'O relicário de Santa Ilda voltou à capela. Frei Anselmo cumprimenta-te pelo nome.'
      }
    },
    pedrafunda: {
      nome: 'Pedra-Funda',
      desc: 'Aldeia mineira de casas de xisto e homens cansados.',
      ecos: {
        mineiros_salvos: 'Os mineiros que salvaste pagam-te um copo sempre que passas.',
        goblins_pagos: 'Dizem que os goblins ainda andam lá em baixo, contentes com a prata.'
      }
    }
  };

  /* ---------- Modelos de missão ----------
     Cada variante define, antes da expedição, o culpado, as pistas,
     o objeto-chave e as soluções. O mapa é gerado depois e validado. */
  CP.MISSOES = [
    {
      id: 'sinos', tipo: 'cripta', local: 'corvamonte', cliente: 'Os aldeões de Corvamonte', recompensa: 20,
      nomes: ['Valdrem', 'Ossória', 'Ervedal', 'São Brás'],
      titulo: v => `Cripta de ${v.nome}`,
      intro: v => `Os aldeões de Corvamonte juram que, desde que a velha cripta de ${v.nome} foi aberta pelo terramoto, as galinhas desaparecem e ouvem-se sinos debaixo da terra. Pagaram-te 20 moedas para descobrires o que se passa.`,
      objetivo: 'Descobre o que toca os sinos e acaba com os desaparecimentos.',
      ambiente: 'ouves um sino abafado',
      variantes: [
        {
          id: 'ghoul', chefe: 'bertolo', item: 'badalo',
          itemTxt: 'Num nicho partido, entre ossos, brilha um badalo de bronze.',
          pistas: [
            'Penas de galinha e ossos roídos espalhados pelo chão. Algo come aqui, e não é pequeno.',
            'Uma vela acesa num nicho, e um ramo de alecrim atado com fita. Alguém da aldeia vem cá.',
            'Uma lápide: «Aqui jaz Bertolo, sineiro de Corvamonte. Que o seu sino o guarde.» O túmulo foi aberto por dentro.'
          ],
          encontro: 'Uma figura curvada, de pele cinzenta, puxa a corda de um sino sem badalo. Há penas de galinha a seus pés. Vira a cabeça para ti.',
          solucoes: [{ id: 'devolver', rotulo: 'Devolver o badalo a Bertolo', requer: 'badalo', rep: 2, flag: 'bertolo_descansa',
            txt: 'Bertolo agarra o badalo, encolhe-se e deita-se no túmulo. O silêncio desce sobre a cripta.' }],
          vitoria: 'Bertolo cai e não volta a levantar-se. Os sinos calam-se.', flagVitoria: 'bertolo_destruido', repVitoria: 1
        },
        {
          id: 'necro', chefe: 'cassio', item: 'diario',
          itemTxt: 'Debaixo de uma pedra solta está um caderno de capa negra: o diário de Varro.',
          pistas: [
            'Galinhas mortas dispostas em círculo, sem uma gota de sangue. Alguém as usou num ritual.',
            'Uma vela de cera negra, ainda quente. Velas destas não se vendem em Corvamonte.',
            'Marcas de giz no chão: um círculo e a palavra VARRO. Alguém copia os ritos de outro.'
          ],
          encontro: 'Um jovem de manto puído toca um pequeno sino diante de um círculo de giz. Vê-te e aperta o sino contra o peito.',
          solucoes: [{ id: 'diario', rotulo: 'Mostrar o diário de Varro a Cássio', requer: 'diario', rep: 1, flag: 'cassio_poupado',
            txt: 'Cássio lê a última página e empalidece. Larga o sino e rende-se. Volta contigo para Corvamonte.' }],
          vitoria: 'Cássio cai sobre o círculo de giz. O sino rola pelo chão e cala-se.', flagVitoria: 'cassio_morto', repVitoria: 1
        }
      ]
    },
    {
      id: 'reliquia', tipo: 'ruinas', local: 'corvamonte', cliente: 'Frei Anselmo', recompensa: 25,
      nomes: ['de Ost', 'de Monte Calvo', 'da Vila Queimada', 'da Torre de Alva'],
      titulo: v => `Ruínas ${v.nome}`,
      intro: v => `O relicário de Santa Ilda desapareceu da capela de Corvamonte. Frei Anselmo viu uma luz nas ruínas ${v.nome} na mesma noite. Oferece 25 moedas pelo regresso do relicário.`,
      objetivo: 'Recupera o relicário de Santa Ilda.',
      ambiente: 'uma luz fraca tremeluz do outro lado',
      variantes: [
        {
          id: 'bandidos', chefe: 'rasca', item: 'recibo',
          itemTxt: 'Numa bolsa rasgada encontras moedas de cobre e um recibo dobrado.',
          pistas: [
            'Restos de uma fogueira e cascas de castanha. Gente viva acampou aqui.',
            'Um mapa tosco, riscado a carvão, com a capela de Corvamonte assinalada.',
            'Pegadas de botas cardadas, de pelo menos três homens.'
          ],
          encontro: 'Um homem de barba ruiva conta moedas ao lado de um saco. Lá dentro brilha o relicário. Levanta-se devagar e puxa da faca.',
          solucoes: [{ id: 'recibo', rotulo: 'Mostrar o recibo a Rasca', requer: 'recibo', rep: 1, flag: 'reliquia_devolvida',
            txt: 'Rasca vê a própria assinatura e percebe que a guarda o encontraria. Atira-te o relicário e foge pela janela.' }],
          vitoria: 'Rasca cai. O saco com o relicário fica a teus pés.', flagVitoria: 'reliquia_devolvida', repVitoria: 1
        },
        {
          id: 'espirito', chefe: 'guardiao', item: 'pedra',
          itemTxt: 'Entre o entulho está uma pedra lavrada, com um encaixe gasto.',
          pistas: [
            'Pegadas que começam a meio da sala e não levam a lado nenhum.',
            'Velas a arder sem cera, com uma chama azulada. Foi esta a luz que Frei Anselmo viu.',
            'Uma lápide: «Ilda guardou esta capela. Quem lhe devolver o que é dela será poupado.»'
          ],
          encontro: 'Uma figura de luz pálida, vestida de pedra, segura o relicário diante de um altar incompleto. Falta-lhe uma pedra.',
          solucoes: [{ id: 'pedra', rotulo: 'Colocar a pedra no altar', requer: 'pedra', rep: 2, flag: 'reliquia_devolvida',
            txt: 'A pedra encaixa. O guardião inclina a cabeça, pousa o relicário no altar e desfaz-se em pó luminoso.' }],
          vitoria: 'O guardião desfaz-se num grito sem som. O relicário cai no chão.', flagVitoria: 'reliquia_devolvida', repVitoria: 1
        }
      ]
    },
    {
      id: 'mineiros', tipo: 'mina', local: 'pedrafunda', cliente: 'O capataz Gonçalo', recompensa: 25, requer: 'pedrafunda',
      nomes: ['da Boca do Lobo', 'do Veio Fundo', 'Negra', 'do Corvo'],
      titulo: v => `Mina ${v.nome}`,
      intro: v => `Na velha mina ${v.nome}, três mineiros desceram para recuperar ferramentas e não voltaram. O capataz Gonçalo oferece 25 moedas a quem os trouxer de volta.`,
      objetivo: 'Encontra os mineiros e afasta a ameaça.',
      ambiente: 'ouves um gemido humano',
      variantes: [
        {
          id: 'aranhas', chefe: 'maearanha', item: 'oleo',
          itemTxt: 'Num gancho pende um frasco de óleo de lamparina, ainda cheio.',
          pistas: [
            'Fios de teia grossos como corda atravessam o túnel.',
            'Um capacete de mineiro coberto de seda, pendurado do teto.',
            'Ovos brancos do tamanho de um punho, quentes ao toque. O ninho é mais abaixo.'
          ],
          encontro: 'Três vultos envoltos em seda pendem do teto. Por cima deles, uma aranha do tamanho de um vitelo move as patas devagar.',
          solucoes: [{ id: 'fogo', rotulo: 'Pegar fogo ao ninho com o óleo', requer: 'oleo', rep: 2, flag: 'mineiros_salvos',
            txt: 'As teias ardem depressa. A aranha foge para o fundo e não volta. Cortas a seda: os mineiros ainda respiram.' }],
          vitoria: 'A mãe-aranha encolhe as patas e morre. Cortas a seda: os mineiros ainda respiram.', flagVitoria: 'mineiros_salvos', repVitoria: 1
        },
        {
          id: 'goblins', chefe: 'gorm', item: 'pepita',
          itemTxt: 'Numa fenda da parede brilha uma pepita de prata do tamanho de um ovo.',
          pistas: [
            'Pegadas pequenas, de pés descalços, e um machado de mineiro arrastado.',
            'Um caldeirão frio com restos de pão roubado.',
            'Rabiscos na parede: um goblin com coroa sentado numa pilha de pedras brilhantes.'
          ],
          encontro: 'Um goblin gordo, com uma coroa de lata, está sentado num trono de caixotes. Três mineiros amarrados olham para ti.',
          solucoes: [{ id: 'pepita', rotulo: 'Oferecer a pepita em troca dos mineiros', requer: 'pepita', rep: 1, flag: 'goblins_pagos',
            txt: 'Gorm morde a pepita, sorri e acena. Os mineiros são empurrados na tua direção.' }],
          vitoria: 'Gorm cai do trono. Desamarras os mineiros.', flagVitoria: 'mineiros_salvos', repVitoria: 1
        }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
