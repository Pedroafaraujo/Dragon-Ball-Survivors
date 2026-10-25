# Dragon Ball Survivors

Jogo de sobrevivência 2D para navegador em HTML5 Canvas, CSS e JavaScript ES Modules. Este é o mesmo jogo existente, com uma reforma do movimento e das animações de combate. Cinco personagens, Namek, progressão por nível, ataques automáticos e Freeza com duas fases continuam disponíveis. Arte PNG original criada para o projeto; sem frameworks, APIs, imagens remotas ou backend.

## Jogar

A versão **`Dragon-Ball-Survivors.html`** inclui código e PNG num único ficheiro e pode ser aberta diretamente num navegador moderno. É maior porque inclui todas as formas e animações. Para desenvolvimento, é preferível a versão modular:

```sh
python3 -m http.server 8000
```

Abre `http://localhost:8000`. `npm start` executa o mesmo servidor estático. Não abras o `index.html` modular por `file://`: os módulos e PNG relativos precisam de HTTP.

- Computador: WASD/setas; Escape ou Ⅱ para pausar.
- Android: toca e arrasta na arena para usar o joystick; Ⅱ para pausar. Retrato e paisagem são suportados.
- Ataques automáticos apontam para os inimigos próximos. O movimento continua durante a preparação e execução das técnicas.
- Recolhe cristais de XP e escolhe entre três melhorias ao subir de nível.
- Sobrevive 20 minutos de tempo ativo; depois derrota Freeza. O confronto final pode prolongar a partida. A derrota ocorre quando a vida chega a zero.
- Pausa, reinício e seleção de personagem mantêm-se disponíveis. Recordes e definições usam o mesmo `localStorage` anterior.

## Personagens, técnicas e transformações

| Personagem | Técnicas                                   | Progressão automática                                                    |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Goku       | Ki Blasts, Kamehameha, Genki Dama          | SSJ 5, SSJ2 10, SSJ3 15, God 20, Blue 25, Ultra Instinct 30              |
| Vegeta     | Galick Gun, Big Bang Attack, Final Flash   | SSJ 5, SSJ2 10, God 15, Blue 20, Ultra Ego 30                            |
| Kid Buu    | Braço elástico, Rajada de ki, Planet Burst | Evoluções de técnicas em 5/10/15/20/25/30; sem formas físicas inventadas |
| Krillin    | Kienzan, Taiyoken, Kienzan duplo/triplo    | Evoluções de técnicas em 5/10/15/20/25/30; sem Super Saiyan              |
| Gohan      | Masenko, Kamehameha, Special Beam Cannon   | SSJ 5, SSJ2 10, Ultimate 20, Beast 30                                    |

A técnica secundária desbloqueia no nível 3 e a final no nível 8. Personagens, atributos base, melhorias, limiares de XP, marcos de formas, arena, dano e cadências base das técnicas mantêm os valores anteriores. Colisões com terreno, controlos e formato dos recordes foram preservados. O contacto dos inimigos agora inclui a antecipação pedida; knockback e separação também alteram deliberadamente a movimentação e o momento dos impactos. Estes tempos precisam de balanceamento prolongado em partidas completas.

## Animações e movimento

`src/animation.js` contém uma máquina reutilizável com **idle, walk, run, attack, charge, cast, hurt, knockback, transform e death**. Os clips têm frames, duração, prioridade, direção e transições. Eventos repetidos com o mesmo token não reiniciam o clip; morte não pode ser interrompida por um ataque de prioridade inferior.

- Marcha/corrida usam **distância realmente percorrida**, incluindo colisões. Empurrar uma parede não faz os pés continuarem a andar.
- Aceleração vetorial alcança a velocidade existente em cerca de 100 ms; a travagem demora menos de 100 ms. Diagonais não aumentam a velocidade máxima.
- Mudanças de direção preservam a fase do passo e usam histerese para evitar oscilações nos movimentos diagonais.
- O ponto de apoio dos sprites normalizados é o pixel 84 da célula; a sombra usa o mesmo chão.
- Ataques em movimento usam uma pose completa de ataque. Não se misturam pernas e troncos de animações incompatíveis; o movimento físico continua permitido.
- Física e animação avançam em passos fixos de 1/60 s, com delta time e interpolação visual de posições. Pausa e perda de foco suspendem o combate.

**Quatro direções** são suportadas. Não existem oito vistas desenhadas. Algumas vistas laterais em falta nos mestres foram espelhadas durante a normalização; isso está documentado nos scripts de packing. Cada forma usa o seu próprio sprite completo. As formas sem poses de combate específicas usam temporariamente a guarda completa da forma, identificada no manifesto; não se recolore o corpo base nem se sobrepõe cabelo. As cinco formas base mantêm poses de assinatura próprias.

## Inimigos

Saibamen, soldados, Guldo, Recoome, Burter, Jeice, Ginyu e as duas fases visuais de Freeza têm folhas de movimento e combate próprias, com idle, passos, antecipação/ataque, reação e morte. Os perfis pesados aceleram mais lentamente e resistem mais ao knockback. Os rápidos têm resposta de direção mais rápida.

A separação usa uma grelha espacial e impulsos limitados; não muda os obstáculos da arena. Os ataques de contacto têm wind-up antes de verificar o alcance e aplicar dano. Freeza também carrega os disparos antes de lançar as rajadas radiais; a segunda fase mantém as rajadas mais densas e frequentes. Cadáveres deixam de participar nas colisões e executam a sua sequência de queda antes de desaparecer.

## Técnicas com fases reais

`src/weapons.js` define preparação, carregamento, lançamento, impacto e recuperação para cada técnica. Cooldowns e valores de dano/área anteriores foram conservados; o dano deixa de acontecer antes da preparação.

- **Kamehameha:** carga de mãos, extensão progressiva de feixe azul e recuperação.
- **Galick Gun:** carga violeta mais curta e feixe próprio.
- **Final Flash:** braços abertos, reunião das palmas e feixe dourado largo.
- **Masenko:** mãos à testa e lançamento dourado.
- **Kienzan:** palma elevada, disco desenhado em rotação e lançamento penetrante.
- **Genki Dama:** braços acima da cabeça, esfera carregada, voo e explosão no destino.
- **Big Bang Attack:** esfera azul lançada até ao alvo antes da explosão.
- **Planet Burst:** carga com uma mão elevada, arremesso e explosão magenta.
- **Special Beam Cannon:** carga focada e feixe helicoidal amarelo/violeta.
- **Taiyoken:** preparação junto do rosto, flash em área e o abrandamento anterior.
- Braço elástico e rajada de Buu também usam a linha temporal e poses de ataque.

Feixes nascem nas âncoras das mãos e acompanham a posição do emissor. A frente animada do feixe determina quando os alvos são atingidos; um conjunto de alvos impede dano repetido no mesmo lançamento. Discos/projéteis usam colisão varrida para não atravessarem inimigos a FPS baixos. Esferas só aplicam dano de área quando chegam ao destino. Explosões têm expansão e dissipação. Impactos fortes produzem um hit stop limitado a 32 ms, reação, números de dano e shake moderado, respeitando a definição de câmara.

Transformações interrompem brevemente movimento e novos ataques: preparação, aura crescente, flash breve, troca única pelo corpo completo e recuperação. A troca aguarda os assets da forma alvo; projéteis já lançados continuam a existir. Os bónus de progressão mantêm os marcos anteriores. Auras dourada, God, Blue, Ultra Instinct, Ultra Ego e Beast têm silhuetas e frames diferentes, além de ritmos próprios.

## Inspecionar e testar

Com o servidor ativo:

- `tools/frame-review.html`: inspeção individual de todas as folhas, limites, chão, âncora da mão e estatuto de arte.
- `tools/animation-review.html`: estúdio com os dez estados dos cinco personagens, quatro direções, câmara lenta e apoio dos pés.
- `tools/art-review.html`: galeria de formas.

Os testes de lógica não precisam de instalar pacotes, apenas Node.js 20+:

```sh
npm test
for file in src/*.js tools/*.cjs; do node --check "$file" || exit 1; done
```

Os testes cobrem prioridades/transições, marcha independente do FPS, travagem/colisões, separação, pooling, fases e dano sincronizado de todas as técnicas, transformações, contacto, boss e os PNG/atlas.

Testes opcionais de navegador usam Playwright e um Chromium instalado. Com o servidor ativo:

```sh
npm install --no-save --package-lock=false playwright
CHROMIUM_PATH=/usr/bin/chromium node tools/browser-smoke.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/animation-smoke.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/verify-sprite-fix.cjs
```

`GAME_URL` permite outro endereço de servidor. O teste de animação verifica 960 amostras de poses de jogadores/inimigos, 14 linhas temporais de técnicas em movimento, transformação, duas fases de Freeza e um gesto tátil real em viewport Android através do protocolo do Chromium. O teste de fluxo verifica pausa, níveis, vitória/derrota e persistência. `?test` expõe `window.__game` para instrumentação local; não altera as regras normais.

## Assets e otimização

- `assets/manifest.json`: as 23 folhas de base existentes.
- `assets/animation-manifest.json`: 99 folhas adicionais de animação/assinaturas/auras, com corpos completos por forma e fallbacks explicitamente identificados.
- `assets/source/`: todos os mestres PNG originais; não são descarregados pelo jogo normal.
- `assets/packed/`: texturas normalizadas, com células RGBA de 96 × 96 e quatro colunas. A execução modular carrega as formas conforme necessário; um teste mantém o total abaixo de 16 MiB.
- `assets/animation-layouts.json`: recortes corrigidos para os mestres com espaçamento/linhas irregulares.

Os PNG de corpos têm transparência limpa e paletas quantizadas, com nearest-neighbor e sem filtros de blur no combate. As fontes de maior resolução são mantidas sem alterações. O packing extrai atores completos dos mestres por componentes de alpha, com alinhamento ao chão e eixo do corpo. `assets/atlas-repair-report.json` regista a proveniência; `src/frame-data.js` fornece os limites e mãos por frame. Não há composição de cabelo.

Limites: 180 inimigos comuns (boss pode usar uma vaga adicional), 300 partículas, pools de 180 projéteis por grupo, 24 cadáveres, 30 números de dano, 12 explosões visuais e oito feixes desenhados. Hitboxes continuam a usar os valores de área reais; dimensões de efeitos muito grandes são limitadas apenas no desenho. A resolução continua limitada a 2×. Não é garantido 60 FPS em todos os Android.

Os PNG prontos estão incluídos; não é necessário fazer build para jogar ou publicar. Para reconstruir texturas após editar mestres, usa as dependências opcionais e o servidor local:

```sh
python3 -m pip install -r tools/requirements-assets.txt
python3 tools/repair-atlases.py
python3 tools/make-repair-previews.py
python3 tools/export-standalone.py Dragon-Ball-Survivors.html
```

Os testes de navegador respeitam `CHROMIUM_PATH` e `GAME_URL`. Os antigos pack-animation/pack-signatures/optimize-animation delegam agora no reparador seguro; não regenerar as animações com recortes uniformes. A exportação HTML inclui todas as texturas e todos os módulos numa distribuição offline maior.

## Publicar e descarregar

O repositório pode ser descarregado pelo botão **Code → Download ZIP**. Para GitHub Pages: **Settings → Pages → Deploy from a branch → main → / (root)**. Não há instalação, build ou serviços de aplicação. Todos os caminhos são relativos e `.nojekyll` está incluído. Ativar GitHub Pages é uma ação separada do envio dos ficheiros para o repositório.

## Limitações concretas

A correção reutiliza a arte original existente, sem chamadas a APIs. Não foram desenhadas novas poses para todas as transformações: 45 folhas de ação/reação/assinatura usam a guarda completa da forma; 15 folhas de locomoção transformada reutilizam os passos completos existentes. Não se anuncia corrida ou ataque exclusivo onde não existe arte adequada. Buu, Burter e Jeice usam os passos frontais completos existentes onde o mestre não tinha corrida frontal. Algumas vistas laterais são espelhadas; não há oito direções.

Há 23 testes automáticos, incluindo a integridade dos 3.600 frames de animação e 320 frames das formas completas. A validação visual e capturas estão em [docs/animation-validation.md](docs/animation-validation.md), e as causas em [docs/animation-diagnosis.md](docs/animation-diagnosis.md). Foram testados Chromium desktop e viewport Android com toque simulado; não houve teste num telemóvel físico nem partida manual completa de 20 minutos. A qualidade das poses originais ainda beneficia de revisão artística manual.
