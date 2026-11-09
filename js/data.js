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
    pedra: { nome: 'Pedra do altar', tipo: 'missao', desc: 'Uma pedra lavrada, com um encaixe gasto.' },
    trompa: { nome: 'Trompa de caça', tipo: 'missao', desc: 'A trompa de Brígida, com um lobo gravado no bocal.' },
    selo: { nome: 'Selo da abadia', tipo: 'missao', desc: 'Um selo de bronze com a cruz de São Vicente e uma onda.' },
    badalo_prata: { nome: 'Badalo de prata', tipo: 'missao', desc: 'Pequeno e frio. Os mortos não suportam o som da prata.' }
  };

  CP.LOJA = ['pocao', 'gazua', 'oleo', 'gibao', 'escudo', 'cota', 'espadalonga', 'punhalfino'];

  /* ---------- Monstros ---------- */
  // atk: dificulta a tua defesa · def: dificulta o teu ataque
  /* Intenções (o que a criatura anuncia antes de agir):
     golpe: ataque normal (força 4+atk) · forte: ataque pesado (força 6+atk, +1 dano) · drenar: golpe que cura 1
     feitico: força 5, 2 de dano, a armadura não conta (o dado de Espírito defende com +2)
     teia: força 5, se acertar perdes um dado na ronda seguinte · defender: +2 à defesa nesta ronda
     chamar: chama um aliado (uma vez) · fugir: foge quando está quase morto · curar: recupera vida */
  CP.FAMILIAS = { morto: 'Morto-vivo', fera: 'Fera', humano: 'Humano', goblin: 'Goblinoide' };

  CP.MONSTROS = {
    rato: { nome: 'Rato gigante', pv: 2, atk: 0, def: 0, dano: 1, fam: 'fera', fraco: 'forca', int: { golpe: 3, fugir: 1 } },
    esqueleto: { nome: 'Esqueleto', pv: 3, atk: 0, def: 0, dano: 1, morto: true, fam: 'morto', fraco: 'espirito', int: { golpe: 3, forte: 1, defender: 1 } },
    ghoul: { nome: 'Ghoul', pv: 4, atk: 1, def: 0, dano: 2, morto: true, fam: 'morto', fraco: 'espirito', int: { golpe: 2, forte: 2, drenar: 1 } },
    aranha: { nome: 'Aranha gigante', pv: 3, atk: 0, def: 1, dano: 1, fam: 'fera', fraco: 'forca', int: { golpe: 3, teia: 2 } },
    goblin: { nome: 'Goblin', pv: 2, atk: 0, def: 0, dano: 1, fam: 'goblin', fraco: 'astucia', int: { golpe: 3, chamar: 1, defender: 1, fugir: 1 }, aliado: 'goblin' },
    lobo: { nome: 'Lobo', pv: 3, atk: 1, def: 0, dano: 1, fam: 'fera', fraco: 'forca', int: { golpe: 2, forte: 1, chamar: 1 }, aliado: 'lobo' },
    bandido: { nome: 'Bandido', pv: 3, atk: 0, def: 0, dano: 1, fam: 'humano', fraco: 'agilidade', int: { golpe: 2, forte: 1, defender: 1 } },
    morcego: { nome: 'Morcego vampiro', pv: 2, atk: 1, def: 0, dano: 1, fam: 'fera', fraco: 'agilidade', int: { drenar: 3, golpe: 1 } },
    javali: { nome: 'Javali raivoso', pv: 4, atk: 0, def: 0, dano: 2, fam: 'fera', fraco: 'agilidade', int: { forte: 2, golpe: 1 } },
    besouro: { nome: 'Besouro-rinoceronte', pv: 4, atk: 0, def: 1, dano: 1, fam: 'fera', fraco: 'forca', int: { defender: 2, golpe: 2, forte: 1 } },
    bertolo: { nome: 'Bertolo, o sineiro', pv: 6, atk: 1, def: 0, dano: 2, morto: true, fam: 'morto', fraco: 'espirito', int: { golpe: 2, forte: 1, drenar: 1 }, fase2: { int: { forte: 2, golpe: 1 }, chama: 'esqueleto', txt: 'Bertolo toca o sino partido. Um esqueleto ergue-se do chão!' } },
    cassio: { nome: 'Cássio, aprendiz de necromante', pv: 5, atk: 1, def: 1, dano: 2, fam: 'humano', fraco: 'forca', int: { feitico: 2, defender: 1, golpe: 1 }, fase2: { int: { feitico: 3, golpe: 1 }, chama: 'esqueleto', txt: 'Cássio grita palavras proibidas. Os ossos do chão levantam-se!' } },
    maearanha: { nome: 'Mãe-aranha', pv: 7, atk: 1, def: 1, dano: 2, fam: 'fera', fraco: 'forca', int: { golpe: 2, teia: 2 }, fase2: { int: { forte: 2, teia: 1 }, chama: 'aranha', txt: 'A mãe-aranha guincha. Uma cria desce do teto!' } },
    gorm: { nome: 'Gorm, chefe goblin', pv: 6, atk: 1, def: 0, dano: 2, fam: 'goblin', fraco: 'astucia', int: { golpe: 2, chamar: 1, defender: 1 }, aliado: 'goblin', fase2: { int: { forte: 3 }, dano: 1, txt: 'Gorm atira a coroa ao chão e entra em fúria!' } },
    rasca: { nome: 'Rasca, o salteador', pv: 6, atk: 0, def: 1, dano: 2, fam: 'humano', fraco: 'agilidade', int: { golpe: 2, forte: 1, defender: 1 }, fase2: { int: { teia: 1, forte: 2 }, txt: 'Rasca atira-te areia aos olhos e saca de uma segunda faca!' } },
    mimico: { nome: 'Baú-mímico', pv: 5, atk: 1, def: 1, dano: 2, fam: 'fera', fraco: 'agilidade', int: { forte: 2, golpe: 1 } },
    alfa: { nome: 'O Alfa de Negrume', pv: 8, atk: 1, def: 1, dano: 2, fam: 'fera', fraco: 'forca', int: { golpe: 2, forte: 2, chamar: 1 }, aliado: 'lobo', fase2: { int: { forte: 3, golpe: 1 }, chama: 'lobo', txt: 'O alfa uiva e o sino de ferro ao pescoço toca sozinho. Mais olhos brilham na escuridão!' } },
    abade: { nome: 'Abade Gualdim, o Afogado', pv: 9, atk: 1, def: 0, dano: 2, morto: true, fam: 'morto', fraco: 'espirito', int: { golpe: 2, drenar: 2, feitico: 1 }, fase2: { int: { feitico: 2, drenar: 2 }, chama: 'ghoul', txt: 'A água do lodo sobe-lhe pelo corpo. Um monge afogado ergue-se a seu lado!' } },
    varro: { nome: 'Varro, o Mestre dos Sinos', pv: 13, atk: 1, def: 1, dano: 2, fam: 'humano', fraco: 'espirito', int: { feitico: 2, chamar: 1, defender: 1, golpe: 1 }, aliado: 'esqueleto', fase2: { int: { feitico: 3, curar: 1, forte: 1 }, chama: 'ghoul', dano: 1, txt: 'Varro bate com o punho no Sino Negro. O som rasga a torre e os mortos respondem!' } },
    guardiao: { nome: 'Guardião espectral', pv: 6, atk: 1, def: 1, dano: 2, morto: true, fam: 'morto', fraco: 'espirito', int: { feitico: 2, golpe: 1, defender: 1 }, fase2: { int: { feitico: 2, curar: 1, forte: 1 }, txt: 'O guardião ergue a espada. A luz da capela fecha-lhe as feridas.' } }
  };

  /* ---------- Tipos de masmorra ---------- */
  CP.TIPOS = {
    cripta: {
      nome: 'Cripta',
      salas: ['Ossário', 'Capela funerária', 'Galeria de nichos', 'Câmara dos sarcófagos', 'Sacristia', 'Cripta lateral', 'Átrio das lápides'],
      descs: ['Nichos com ossadas alinhadas até ao teto.', 'O ar cheira a cera velha e a terra molhada.', 'Um sarcófago partido, com a tampa no chão.',
        'Raízes atravessam a abóbada e pingam água.', 'Restos de um altar cobertos de pó cinzento.', 'Paredes cheias de nomes riscados à faca.',
        'Um frio húmido sobe do chão de pedra.'],
      monstros: ['esqueleto', 'esqueleto', 'rato', 'ghoul', 'morcego'],
      armadilha: { nome: 'laje solta', txt: 'Uma laje cede e saltam dardos das paredes.', dano: 2 },
      presagio: 'As chamas tremem todas ao mesmo tempo. Algo se mexe nas profundezas.'
    },
    mina: {
      nome: 'Mina',
      salas: ['Galeria escorada', 'Poço de extração', 'Armazém de ferramentas', 'Veio esgotado', 'Câmara inundada', 'Forja abandonada', 'Cruzamento de carris'],
      descs: ['Vigas podres seguram o teto a custo.', 'Carris enferrujados perdem-se na escuridão.', 'A água escorre pelas paredes e junta-se em poças negras.',
        'Picaretas partidas e um carrinho virado.', 'O eco dos teus passos volta atrasado.', 'Há pó de pedra suspenso no ar.', 'Uma lamparina partida pende de um gancho.'],
      monstros: ['aranha', 'goblin', 'rato', 'goblin', 'besouro'],
      armadilha: { nome: 'teto instável', txt: 'Uma viga estala e cai uma chuva de pedras.', dano: 2 },
      presagio: 'Cai pó do teto. Algo grande desloca-se nos túneis.'
    },
    ruinas: {
      nome: 'Ruínas',
      salas: ['Salão desabado', 'Claustro', 'Torre caída', 'Refeitório', 'Pátio interior', 'Biblioteca queimada', 'Capela sem teto'],
      descs: ['Metade do teto caiu; vês o céu cinzento.', 'A hera cobre as colunas partidas.', 'Um fogão de pedra, frio há décadas.',
        'Estantes carbonizadas e páginas a esvoaçar.', 'O musgo grosso abafa os teus passos.', 'Uma estátua sem cabeça vigia a porta.', 'Vidros de cor partidos brilham no chão.'],
      monstros: ['bandido', 'lobo', 'esqueleto', 'rato', 'javali'],
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

  /* ---------- Relíquias (efeitos permanentes) ---------- */
  CP.RELIQUIAS = {
    dente_lobo: { nome: 'Dente de lobo', desc: '+1 de dano contra feras.' },
    rosario: { nome: 'Rosário de osso', desc: '+1 de dano contra mortos-vivos.' },
    pedra_amolar: { nome: 'Pedra de amolar', desc: 'O primeiro ataque de cada combate causa +1 de dano.' },
    amuleto: { nome: 'Amuleto da sorte', desc: '+1 de fôlego em cada expedição.' },
    botas: { nome: 'Botas de couro macio', desc: '+2 para fugir e para te esgueirares.' },
    calice: { nome: 'Cálice rachado', desc: 'Descansar cura +2.' },
    olho: { nome: 'Olho de vidro', desc: 'Vês sempre a fraqueza das criaturas.' },
    escudo_vime: { nome: 'Broquel de vime', desc: '+1 a todos os dados de defesa.' },
    moeda: { nome: 'Moeda viciada', desc: 'O primeiro relançamento de cada combate não gasta fôlego.' },
    coracao: { nome: 'Coração de pedra', desc: '+3 de vida máxima.' }
  };

  /* ---------- Talentos (escolha ao subir de nível) ---------- */
  CP.TALENTOS = {
    pele_dura: { nome: 'Pele dura', desc: '+3 de vida máxima.' },
    folego_longo: { nome: 'Fôlego longo', desc: '+1 de fôlego em cada expedição.' },
    olho_atento: { nome: 'Olho atento', desc: 'Vantagem a investigar.' },
    maos_rapidas: { nome: 'Mãos rápidas', desc: 'As poções curam +2.' },
    mestre_armas: { nome: 'Mestre de armas', classe: 'guerreiro', desc: 'Podes pôr dois dados no ataque.' },
    contra_ataque: { nome: 'Contra-ataque', classe: 'guerreiro', desc: 'Defender com o valor máximo do dado fere o atacante (1 de dano).' },
    couraca: { nome: 'Couraça', classe: 'guerreiro', desc: '+1 a todos os dados de defesa.' },
    sombra: { nome: 'Sombra', classe: 'ladrao', desc: 'Na primeira ronda de cada combate os inimigos não agem.' },
    bolsos: { nome: 'Bolsos fundos', classe: 'ladrao', desc: '+1 espaço na mochila.' },
    golpe_duplo: { nome: 'Golpe sujo', classe: 'ladrao', desc: 'O Golpe baixo aceita dados até 4.' },
    batedor: { nome: 'Batedor', classe: 'explorador', desc: 'Vês sempre a fraqueza das criaturas.' },
    cacador: { nome: 'Caçador', classe: 'explorador', desc: '+1 de dano contra feras.' },
    sobrevivente: { nome: 'Sobrevivente', classe: 'explorador', desc: 'Descansar cura +2 e faz menos barulho.' },
    fe: { nome: 'Fé', classe: 'mistico', desc: '+1 ritual em cada expedição.' },
    luz_interior: { nome: 'Luz interior', classe: 'mistico', desc: 'A Prece cura o valor inteiro do dado.' },
    exorcista: { nome: 'Exorcista', classe: 'mistico', desc: '+1 de dano contra mortos-vivos.' }
  };

  /* ---------- Habilidade de combate de cada classe (usa um dado) ---------- */
  CP.HABILIDADES = {
    guerreiro: { nome: 'Investida', desc: 'Dado 4+: o ataque desta ronda causa +2 de dano.' },
    ladrao: { nome: 'Golpe baixo', desc: 'Dado até 3: soma-se ao dado de ataque.' },
    explorador: { nome: 'Rasteira', desc: 'Dado 5+: o alvo fica atordoado e não age nesta ronda.' },
    mistico: { nome: 'Prece', desc: 'Cura metade do valor do dado (arredondado para cima).' }
  };

  /* ---------- Companheiros: juntam um dado ao teu combate ---------- */
  CP.COMPANHEIROS = {
    bras: { nome: 'Brás, mercenário', sprite: 'guarda', retrato: 'bras', dado: 2, custo: 15, desc: 'Junta um d8 aos teus dados. Cobra 15 moedas por expedição.' },
    brigida: { nome: 'Brígida, caçadora', sprite: 'aldea', retrato: 'brigida', dado: 2, requer: 'brigida_salva', desc: 'Junta um d8. +1 de dano contra feras.' },
    cassio: { nome: 'Cássio, o arrependido', sprite: 'm:necromante', retrato: 'cassio', dado: 1, requer: 'cassio_poupado', desc: 'Junta um d6. +1 de dano contra mortos-vivos.' },
    tome: { nome: 'Tomé, mineiro', sprite: 'aldeao', retrato: 'tome', dado: 1, requer: 'mineiros_salvos', desc: 'Junta um d6. Vantagem a investigar e deteta armadilhas.' }
  };
  CP.FERIMENTOS = {
    braco: { nome: 'Braço ferido', attr: 'forca', desc: 'A Força desce um dado.' },
    perna: { nome: 'Perna coxa', attr: 'agilidade', desc: 'A Agilidade desce um dado.' },
    olho: { nome: 'Olho inchado', attr: 'astucia', desc: 'A Astúcia desce um dado.' },
    pesadelos: { nome: 'Pesadelos', attr: 'espirito', desc: 'O Espírito desce um dado.' },
    cicatriz: { nome: 'Ferida funda', pv: 2, desc: '−2 de vida máxima.' }
  };

  /* ---------- Melhorias da aldeia ---------- */
  CP.MELHORIAS = {
    ferreiro: { nome: 'Ferreiro', niveis: [{ custo: 30, desc: 'Afiar armas: +1 ao dado de ataque com a tua arma.' }, { custo: 60, desc: 'Reforçar armaduras: +1 a todos os dados de defesa.' }] },
    templo: { nome: 'Capela', niveis: [{ custo: 30, desc: '+1 de fôlego em cada expedição.' }, { custo: 60, desc: 'Proteção: na derrota não perdes ouro nem tesouros.' }] },
    estalagem: { nome: 'Estalagem', niveis: [{ custo: 20, desc: 'Dormir passa a ser grátis.' }, { custo: 45, desc: 'Partes sempre com uma poção extra (se houver espaço).' }] },
    mercado: { nome: 'Mercado', niveis: [{ custo: 35, desc: 'Desconto de 20% e uma relíquia à venda.' }] }
  };

  /* ---------- Eventos com escolhas (salas especiais) ---------- */
  CP.EVENTOS = {
    altar: { tipos: ['cripta', 'ruinas'], titulo: 'Altar esquecido', img: 'f3',
      txt: 'Um altar de pedra com velas apagadas. Uma taça de prata repousa no centro, coberta de pó.',
      op: [['rezar', 'Rezar (Espírito)'], ['profanar', 'Levar a taça de prata'], ['ignorar', 'Deixar o altar em paz']] },
    pocao: { tipos: ['cripta', 'mina', 'ruinas'], titulo: 'Frasco misterioso', img: 'f14',
      txt: 'Num nicho, um frasco de vidro com um líquido que muda de cor quando o mexes.',
      op: [['beber', 'Beber'], ['ignorar', 'Deixar ficar']] },
    prisioneiro: { tipos: ['mina', 'ruinas', 'cripta'], titulo: 'Prisioneiro', img: 'r17',
      txt: '«Por favor!» Um homem magro, acorrentado à parede, olha para ti. «Conheço estes corredores.»',
      op: [['libertar', 'Libertar (Força ou gazuas)'], ['interrogar', 'Perguntar pelo dono deste sítio'], ['ignorar', 'Seguir caminho']] },
    bau: { tipos: ['cripta', 'mina', 'ruinas'], titulo: 'Baú ornamentado', img: 'r20',
      txt: 'Um baú bonito demais para este lugar, sem pó nenhum. A fechadura parece… húmida.',
      op: [['examinar', 'Examinar com cuidado (Astúcia)'], ['abrir', 'Abrir'], ['ignorar', 'Não tocar']] },
    fonte: { tipos: ['cripta', 'ruinas', 'mina'], titulo: 'Fonte murmurante', img: 'f6',
      txt: 'Água limpa escorre de uma cabeça de pedra. Ouve-se um murmúrio, quase uma voz.',
      op: [['beber', 'Beber da fonte'], ['moeda', 'Atirar uma moeda e pedir sorte'], ['ignorar', 'Seguir caminho']] },
    ferido: { tipos: ['cripta', 'mina', 'ruinas'], titulo: 'Aventureiro ferido', img: 'r15',
      txt: 'Um aventureiro encostado à parede aperta um ferimento. «Não vás lá abaixo sem saber o que te espera…»',
      op: [['pocao', 'Dar-lhe uma poção'], ['ouvir', 'Ouvir o que tem a dizer'], ['ignorar', 'Deixá-lo']] },
    livro: { tipos: ['cripta', 'ruinas'], titulo: 'Livro proibido', img: 'f2',
      txt: 'Sobre um atril, um livro preso com correntes. As páginas viram-se sozinhas.',
      op: [['ler', 'Ler (Astúcia)'], ['queimar', 'Queimar o livro'], ['ignorar', 'Fechá-lo']] },
    vagoneta: { tipos: ['mina'], titulo: 'Vagoneta tombada', img: 'f11',
      txt: 'Uma vagoneta tombada tapa metade do túnel. Por baixo, algo brilha.',
      op: [['empurrar', 'Levantar a vagoneta (Força)'], ['ignorar', 'Passar ao lado']] }
  };

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
        reliquia_devolvida: 'O relicário de Santa Ilda voltou à capela. Frei Anselmo cumprimenta-te pelo nome.',
        livro_sinos: 'Frei Anselmo passa as noites a ler o Livro dos Sinos, de candeia acesa.',
        valdemora_livre: 'Os sinos de Corvamonte tocam outra vez, e desta vez é para festejar.'
      }
    },
    negrume: {
      nome: 'Vau do Negrume',
      desc: 'Povoado de lenhadores à beira de uma floresta escura, onde a névoa nunca levanta de todo.',
      ecos: { brigida_salva: 'Brígida voltou a caçar. Diz que os lobos já não respondem a sinos.', valdemora_livre: 'Pela primeira vez em anos, o sol entra na floresta.' }
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
  /* ---------- Campanha: A Sombra de Varro ---------- */
  // fragmentos que o Ato I revela, conforme a missão cumprida
  CP.FRAGMENTOS = {
    sinos: 'No bronze do sino da cripta alguém gravou um corvo de asas abertas. Frei Anselmo empalidece: «É a marca de Varro.»',
    reliquia: 'Quem roubou o relicário foi pago com uma moeda antiga, cunhada com um corvo. Alguém queria a pedra de Santa Ilda longe da capela.',
    mineiros: 'Nas paredes mais fundas da mina há sinos pequenos pregados à rocha. As criaturas fugiam de algo que tocava lá em baixo.'
  };
  CP.CENAS = {
    ato2: [
      ['frei', 'Frei Anselmo', 'Três sinais, três lugares, a mesma marca. Varro foi monge na Abadia de São Vicente, antes de ser expulso. Dizia que os sinos podiam chamar os mortos.'],
      ['frei', 'Frei Anselmo', 'Morreu há quarenta anos. Ou era isso que todos julgávamos.'],
      ['mensageiro', 'Mensageira do Negrume', 'Venho do Vau do Negrume! Os lobos uivam como se alguém os chamasse, e a caçadora Brígida desapareceu na floresta.'],
      ['frei', 'Frei Anselmo', 'E a seca fez reaparecer as torres da abadia afogada. Se Varro deixou alguma coisa escrita, está lá. Precisamos de ti nos dois lugares.']
    ],
    ato3: [
      ['frei', 'Frei Anselmo', 'Li o Livro dos Sinos a noite inteira. Varro não morreu: prendeu a própria vida dentro de um sino de bronze negro.'],
      ['frei', 'Frei Anselmo', 'Cada sino que encontraste era um eco desse. Quando o Sino Negro tocar do alto da Torre do Corvo, todos os mortos de Valdemora vão responder.'],
      ['frei', 'Frei Anselmo', 'O livro fala de um badalo de prata escondido na própria torre. A prata cala o que a morte faz soar. Encontra-o, e sobe.']
    ]
  };

  CP.MISSOES = [
    {
      id: 'negrume', historia: true, ato: 2, tipo: 'ruinas', local: 'negrume', cliente: 'O povo do Vau do Negrume', paga: 'paga', recompensa: 35,
      nomes: ['da Floresta de Negrume'],
      titulo: () => 'O Santuário de Negrume',
      intro: () => 'No Vau do Negrume os lobos deixaram de temer o fogo. Uivam todos ao mesmo tempo, como se respondessem a um chamamento. A caçadora Brígida foi ao velho santuário da floresta e não voltou.',
      objetivo: 'Encontra Brígida e quebra o que está a chamar os lobos.',
      ambiente: 'ouves um sino de ferro, muito ténue',
      variantes: [{
        id: 'alfa', chefe: 'alfa', item: 'trompa',
        itemTxt: 'Presa numa raiz está uma trompa de caça. Tem um lobo gravado no bocal.',
        pistas: [
          'Pegadas de lobo em círculo à volta de uma pedra com um corvo pintado a sangue seco.',
          'Uma flecha partida, com penas verdes. É das que Brígida usa.',
          'Pendurado num ramo, um sino pequeno sem badalo. Os lobos passam à volta dele sem lhe tocar.'
        ],
        encontro: 'Um lobo enorme, de olhos cor de brasa, guarda uma mulher amarrada a uma pedra. Ao pescoço traz um sino de ferro que não pára de vibrar.',
        solucoes: [{ id: 'trompa', rotulo: 'Tocar a trompa de Brígida', requer: 'trompa', rep: 2, flag: 'brigida_salva',
          txt: 'O som da trompa corta o zumbido do sino. O alfa estremece, sacode a cabeça e foge para a floresta. Desamarras Brígida: «Eu sabia que alguém ouviria.»' }],
        vitoria: 'O alfa tomba e o sino ao pescoço racha de alto a baixo. Brígida está viva.', flagVitoria: 'brigida_salva', repVitoria: 1
      }]
    },
    {
      id: 'abadia', historia: true, ato: 2, tipo: 'cripta', local: 'corvamonte', cliente: 'Frei Anselmo', paga: 'paga', recompensa: 35,
      nomes: ['de São Vicente'],
      titulo: () => 'A Abadia Afogada',
      intro: () => 'A Abadia de São Vicente foi engolida pelo lago há cinquenta anos. A seca deste verão fê-la reaparecer, e Frei Anselmo jura que os sinos tocaram ao luar. Algures no arquivo está o Livro dos Sinos.',
      objetivo: 'Recupera o Livro dos Sinos do arquivo da abadia.',
      ambiente: 'ouves água a pingar e um cântico abafado',
      variantes: [{
        id: 'abade', chefe: 'abade', item: 'selo',
        itemTxt: 'Entre o lodo brilha um selo de bronze, com a cruz de São Vicente e uma onda.',
        pistas: [
          'Bancos de igreja cobertos de lodo, todos virados para a mesma parede, onde alguém pintou um corvo.',
          'Uma lista de monges presa à parede. O último nome está riscado: Varro, expulso por «ouvir o que os sinos não dizem».',
          'Marcas de unhas por dentro da porta do arquivo. Alguém ficou lá fechado quando a água subiu.'
        ],
        encontro: 'Um vulto de hábito encharcado abraça um livro grosso contra o peito. Quando se vira, a água escorre-lhe da boca: «Ninguém tira o livro do abade Gualdim.»',
        solucoes: [{ id: 'selo', rotulo: 'Mostrar o selo da abadia', requer: 'selo', rep: 2, flag: 'livro_sinos',
          txt: 'O abade olha para o selo durante muito tempo. «Então a abadia ainda tem quem a guarde.» Pousa o livro nas tuas mãos e afunda-se devagar no lodo, em paz.' }],
        vitoria: 'O abade desfaz-se em lodo. O Livro dos Sinos fica no chão, quase seco.', flagVitoria: 'livro_sinos', repVitoria: 1
      }]
    },
    {
      id: 'torre', historia: true, ato: 3, tipo: 'cripta', local: 'negrume', cliente: 'Todo o Vale de Valdemora', paga: 'oferece-te', recompensa: 80,
      nomes: ['do Corvo'],
      titulo: () => 'A Torre do Corvo',
      intro: () => 'Do alto da Torre do Corvo vê-se o vale inteiro. É de lá que Varro quer tocar o Sino Negro, e o céu já tem a cor de ferro velho. Sobe, encontra o badalo de prata e silencia o sino.',
      objetivo: 'Derrota Varro ou silencia o Sino Negro.',
      ambiente: 'o ar treme com um zumbido grave',
      variantes: [{
        id: 'varro', chefe: 'varro', item: 'badalo_prata',
        itemTxt: 'Num cofre de pedra aberto à força, um badalo de prata envolto em linho. Ainda está frio.',
        pistas: [
          'Celas vazias, todas com o mesmo sino pequeno pregado por cima da porta.',
          'Uma carta por acabar: «Cássio, se leres isto, foste mais longe do que eu esperava…»',
          'Um mapa de Valdemora com todas as aldeias marcadas a negro. Só a capela de Santa Ilda está riscada a vermelho.'
        ],
        encontro: 'No topo da torre, um velho de manto negro apoia a mão num sino de bronze maior do que uma carroça. «Chegaste tarde, mas chegaste. Ouve comigo.»',
        solucoes: [{ id: 'silenciar', rotulo: 'Pôr o badalo de prata no Sino Negro', requer: 'badalo_prata', rep: 3, flag: 'valdemora_livre',
          txt: 'O badalo de prata encaixa com um estalo. O Sino Negro dá uma única pancada, limpa e alta, e racha ao meio. Varro envelhece cem anos num instante e desfaz-se em pó.' }],
        vitoria: 'Varro cai sobre o sino. Com ele morto, o bronze negro arrefece e cala-se para sempre.', flagVitoria: 'valdemora_livre', repVitoria: 2
      }]
    },
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
