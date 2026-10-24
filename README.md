# Dragon Ball Survivors

Jogo de sobrevivência 2D para navegador, com spritesheets PNG pixel art originais, animações e cenário de Namek redesenhado. O Canvas compõe os PNG; as personagens já não são construídas com figuras geométricas. HTML, CSS e JavaScript ES Modules, sem dependências de execução, imagens externas, APIs, contas ou backend. Interface em português.

## Jogar localmente

Na pasta do projeto:

```sh
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Alternativamente, `npm start` executa o mesmo servidor estático. Não abrir `index.html` diretamente com `file://`, pois os navegadores restringem módulos ES nesse modo. O servidor serve apenas ficheiros; o jogo não precisa de um serviço de aplicação. Node.js só é necessário para os testes.

- **Computador:** WASD ou setas para mover; Escape ou botão Ⅱ para pausar.
- **Android:** toca e arrasta na arena para criar o joystick; botão Ⅱ para pausar. Funciona em retrato e paisagem.
- Os ataques são automáticos e apontam para o inimigo mais próximo no alcance de 650 unidades.
- Recolhe cristais de experiência. Cada nível pausa o jogo e oferece três melhorias aleatórias diferentes.
- As técnicas secundária e final desbloqueiam nos níveis 3 e 8. As evoluções aumentam dano e velocidade; Buu ganha regeneração e Krillin ganha críticos adicionais.
- Sobrevive **20 minutos de tempo ativo**, depois derrota Freeza. O confronto final pode prolongar a partida além dos 20 minutos. Pausas e escolhas não contam para o relógio.
- Vida a zero termina a partida. Ambos os resultados permitem reiniciar ou escolher outro guerreiro.

## Personagens e progressão

| Personagem | Técnicas implementadas                                                  | Progressão automática                                                                  |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Goku       | Ki Blasts, Kamehameha penetrante, Genki Dama em área                    | SSJ 5, SSJ2 10, SSJ3 15, God 20, Blue 25, Ultra Instinct 30                            |
| Vegeta     | Galick Gun penetrante, Big Bang Attack em área, Final Flash largo       | SSJ 5, SSJ2 10, God 15, Blue 20, Ultra Ego 30                                          |
| Kid Buu    | Braço elástico, rajada em leque, Planet Burst em área                   | Evoluções de técnicas nos níveis 5, 10, 15, 20, 25 e 30; sem transformações inventadas |
| Krillin    | Kienzan penetrante, Taiyoken que abranda inimigos, Kienzan duplo/triplo | Evoluções de técnicas nos níveis 5, 10, 15, 20, 25 e 30; sem Super Saiyan              |
| Gohan      | Masenko, Kamehameha, Special Beam Cannon estreito e penetrante          | SSJ 5, SSJ2 10, Ultimate 20, Beast 30                                                  |

As transformações alteram cabelo/aura e atributos, com explosão de partículas e breve efeito de câmara. Cada forma de Goku, Vegeta e Gohan tem uma folha PNG própria, com cabelo e cores distintos em quatro direções. Krillin e Buu mantêm o aspeto base e usam auras animadas nas evoluções das técnicas, sem inventar transformações físicas.

Namek tem arena de 3600 × 3600, câmara centrada no jogador, tiles pixel art, rochas, árvores de copa azul e lagos. As árvores reutilizam os obstáculos anteriores; os lagos são decoração atravessável para preservar exatamente as colisões e regras existentes. Ondas avançam a cada minuto: frequência, quantidade, resistência e dano dos inimigos aumentam. Saibamen, soldados de Freeza e cinco variantes da Força Ginyu (Guldo, Recoome, Burter, Jeice e Ginyu) têm atributos e cores próprios. Freeza surge aos 20 minutos; abaixo de 50% de vida entra na segunda fase, com mais velocidade e rajadas radiais mais densas e frequentes.

Recorde de duração, maior número de eliminações e opções de partículas/câmara são guardados em `localStorage`. Se o armazenamento estiver indisponível, a partida continua normalmente. O recorde mede o tempo sobrevivido, não uma classificação de rapidez para derrotar o boss.

## Testar

Requer Node.js 20 ou posterior, sem instalar pacotes:

```sh
npm test
```

Os 10 testes cobrem os PNG e as grelhas dos atlases, ficheiros distintos para as formas, orçamento de texturas e os marcos de todos os personagens, colisões, experiência, melhorias, ataques dos cinco guerreiros, dano/invulnerabilidade, chegada e fases de Freeza, vitória e limites de entidades. Para verificar a sintaxe de todos os módulos:

```sh
for file in src/*.js; do node --check "$file" || exit 1; done
```

Também foi executado um teste de integração em Chromium: menu, seleção, movimento, pausa, melhorias, transformação, boss, vitória/derrota, persistência e joystick num viewport móvel. O teste é reutilizável em `tools/browser-smoke.cjs`. Para o executar com o servidor local ativo, instala opcionalmente `npm install --no-save --package-lock=false playwright` e executa `CHROMIUM_PATH=/usr/bin/chromium node tools/browser-smoke.cjs` (ajusta o caminho do Chromium à tua máquina; `GAME_URL` permite mudar o endereço do servidor). Esta dependência é apenas para desenvolvimento. Os estados tardios foram acelerados por instrumentação, sem esperar 20 minutos reais. A opção de URL `?test` expõe `window.__game` para inspeção local; não altera as regras normais do jogo.

## Publicar no GitHub Pages

1. Guarda estes ficheiros na branch a publicar e envia-os para o GitHub.
2. No repositório, abre **Settings → Pages**.
3. Em **Build and deployment**, escolhe **Deploy from a branch**.
4. Seleciona a branch (por exemplo `main`) e a pasta **/ (root)**; guarda.
5. Aguarda o deployment do GitHub Pages. O endereço é apresentado nessa página.

Não é necessário build, npm install, domínio próprio ou configuração de servidor. Os caminhos relativos funcionam num site de projeto, como `/Dragon-Ball-Survivors/`. O ficheiro `.nojekyll` permite servir diretamente os ficheiros estáticos. A publicação não é feita automaticamente por este projeto.

## Estrutura e expansão

- `src/main.js`: ciclo de jogo com delta time, progressão, câmara e coordenação.
- `src/characters.js`: atributos, técnicas e formas dos cinco guerreiros.
- `src/transformations.js`: marcos, aspeto e bónus das evoluções.
- `src/config.js`: arenas, tipos de inimigo, variantes, limites e melhorias.
- `src/enemies.js`: ondas, aproximação, contacto, boss e recompensas.
- `src/weapons.js`: projéteis, feixes, explosões e Taiyoken.
- `src/collisions.js`: movimento, limites e obstáculos.
- `src/effects.js` e `src/render.js`: partículas, sprites, profundidade e cenário.
- `src/sprites.js`: carregamento/cache dos PNG, animações, auras e atlas.
- `assets/manifest.json`: grelhas, frames, caminhos e metadados das 23 folhas.
- `assets/source/`: PNG originais de maior resolução, conservados sem alterações.
- `assets/packed/`: PNG normalizados para execução no Android.
- `tools/art-review.html`: galeria animada de personagens, formas e quatro direções.
- `src/input.js`, `src/ui.js` e `src/states.js`: controlos, ecrãs, estados e armazenamento.

Para adicionar arenas de Dragon Ball, Z, GT ou Super, acrescenta definições a `arenas` e tipos a `enemyTypes`, e seleciona a nova arena em `main.js`. Comportamentos especiais ou arte nova exigem implementar os respetivos módulos: não basta anunciar um nome na configuração. Só Namek está disponível nesta versão.

## Desempenho e limites atuais

`requestAnimationFrame`, delta time limitado a 50 ms, resolução até 2×, desenho dos mosaicos visíveis e limites de 180 inimigos comuns, 180 projéteis por grupo, 300 partículas e 250 cristais. Freeza pode ocupar uma vaga adicional. Experiência excedente acumula num cristal existente. A opção de menos partículas reduz os efeitos das eliminações. Ao perder foco, o jogo pausa automaticamente.

A meta é 60 FPS quando o dispositivo permite; não há garantia em todos os Android. O teste móvel foi simulado em Chromium, não executado num telemóvel físico. Ainda faltam áudio, balanceamento prolongado de partidas completas e arenas adicionais. A arte é original, gerada para este projeto com assistência de IA, e pode beneficiar de retoque manual pixel a pixel; não foi copiada de sprites comerciais. Técnicas e transformações são representações estilizadas, não animações fiéis de episódios. O projeto não inclui recursos descarregados de terceiros.

## Reforma visual e otimização

As regras do combate foram preservadas: os nove módulos de mecânicas (`main`, `enemies`, `weapons`, `collisions`, `characters`, `config`, `transformations`, `input` e `states`) mantêm os mesmos SHA-256 da versão anterior a esta reforma. A direção visual é inferida das posições numa `WeakMap` de renderização, sem acrescentar atributos às entidades do jogo. Ordenação por profundidade, sombras e cenários não alteram colisões ou dano.

Existem **20 folhas de personagens (320 frames de origem)**, uma folha de inimigos com 36 frames (incluindo as duas fases visuais de Freeza), uma de efeitos com 16 frames e uma de terreno/objetos com 16 tiles. Cada personagem/forma tem quatro vistas (sul, oeste, este, norte), poses idle e três frames de caminhada. Idle alterna as poses 0/2 lentamente com respiração; caminhada percorre 1/2/3. As auras têm quatro frames próprios e recebem cor na cache, sem filtros caros por frame.

Os PNG originais ocupam cerca de 31 MB, mas **não são descarregados durante o jogo normal**. As 23 texturas otimizadas totalizam cerca de **2,7 MB**; inicialmente só são carregadas as bases e recursos comuns. As formas do personagem escolhido são pré-carregadas no menu. Não é necessário instalar ferramentas nem executar packing para jogar ou publicar: os PNG otimizados já estão incluídos.

O renderer usa `imageSmoothingEnabled = false`, posições arredondadas, tiles/entidades visíveis, auras com cores em cache e desenho de PNG pré-processados. Mantém a resolução máxima e os limites anteriores. Não há leitura de pixels das imagens de origem no ciclo normal de execução.

Para inspecionar todas as formas, abre `tools/art-review.html` através do servidor local. Para repetir o teste visual automatizado, com Playwright opcional instalado e o servidor ativo:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/visual-smoke.cjs
```

Este teste verificou 80 combinações únicas de personagem/forma/direção, frames de caminhada distintos, ausência de PNG em falta, estado do jogo imutável durante desenho e uma multidão de 180 inimigos num viewport tátil simulado. O teste de integração anterior também voltou a passar. Não substitui uma medição num Android físico.

Para regenerar as texturas otimizadas a partir dos PNG originais (apenas desenvolvimento):

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/pack-assets.cjs
```

O packing usa Chromium/Canvas somente para recorte, normalização de grelha e escala com nearest-neighbor; não redesenha nem substitui a arte. O caminho `?raw-assets` destina-se a esse processo e carrega os mestres maiores. Os PNG finais são RGBA, com células de 96 × 96 e quatro colunas. Mais detalhes em `assets/README.md`.

## Exportar uma versão HTML única

Opcionalmente, `python3 tools/export-standalone.py` gera `../Dragon-Ball-Survivors.html`, com módulos e os 23 PNG otimizados embutidos. Este ficheiro não precisa de procurar imagens, fontes ou JavaScript na rede. A versão modular continua a ser a recomendada para desenvolvimento e GitHub Pages.
