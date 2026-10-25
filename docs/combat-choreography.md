# Revisão das animações de combate

Esta revisão trabalha sobre o jogo existente e sobre a correção dos recortes anterior (`0a49f1a`). Não muda personagens, marcos de evolução, valores de dano, cooldowns, obstáculos ou recordes. Não utiliza APIs nem serviços de geração de imagens.

## Problemas encontrados e corrigidos

1. **Ataques concorrentes disputavam a pose.** Cada lançamento chamava `Animator.play` independentemente. Preparação, execução e recuperação usavam relógios diferentes, e a prioridade mudava no lançamento. Agora `src/combat-animation.js` escolhe uma pose corporal dominante e amostra-a diretamente no relógio da técnica. Rajadas menores não reiniciam uma técnica maior; um feixe ativo conserva a pose de emissão. Reações a dano têm prioridade e, depois, o ataque retoma na fase atual, sem repetir a carga.
2. **Os frames de contacto não coincidiam com o dano.** O frame de extensão podia chegar depois dos 160/240 ms do impacto. Agora o frame de antecipação termina no mesmo instante do teste de contacto; segue-se extensão e recuperação. O relógio só pode atualizar a ação com o seu próprio token, evitando conflito com os ataques carregados de Freeza. O boss mantém a direção de preparação até ao lançamento.
3. **A aura Beast tinha fragmentos da linha anterior.** Nas capturas de todas as formas foi identificado um pedaço violeta acima da aura. Foi removido nas quatro células, mantendo a aura branca/rosa completa. Ultimate usa agora a aura branca existente em vez da dourada de Super Saiyan.
4. **Algumas poses mudavam de vista dentro do ataque.** As extensões de Krillin/Gohan para leste e as assinaturas de Vegeta/Gohan tinham frames de costas ou apontados para o lado oposto. Foram selecionadas poses completas coerentes do mesmo personagem, com espelhamento lateral quando necessário e guarda da direção correta na recuperação. Não foram montados membros nem cabelo.
5. **Os efeitos eram demasiado genéricos.** `combat-fx.png` tem 144 frames originais desenhados localmente: 18 estilos × oito desenhos. Feixes têm contorno, núcleo, detalhes móveis e extremidades; há discos, esferas distintas, hélice, braço elástico, impacto, flash e explosões com dissipação. Planet Burst mantém energia magenta; Genki Dama/Big Bang usam explosões azuis. O atlas ocupa cerca de 37 KiB.
6. **Havia oscilações entre marcha e corrida.** O controlador mantém a fase pela distância real e agora usa histerese também na mudança de velocidade. Mantêm-se aceleração/travagem, quatro direções, âncora e chão constantes. Não foram inventadas oito vistas nem uma nova corrida exclusiva para cada forma.

O Special Beam Cannon usa a pose de concentração à testa existente em Gohan; o Taiyoken usa a família de poses de mãos elevadas. Há âncoras medidas por frame para palma, testa e mão elevada. Não se desloca um efeito para uma mão imaginária fora do sprite. Os atlas continuam nítidos, sem blur.

## Desempenho e legibilidade

O movimento físico continua durante os ataques; a transformação mantém a interrupção breve já existente. Física, dano e animação usam delta time. As técnicas simultâneas mantêm os seus próprios temporizadores e lançamentos, mas partilham uma única pose visual dominante: um corpo não executa várias poses incompatíveis ao mesmo tempo.

Mantêm-se os pools de partículas/projéteis e os limites existentes. Marcas de impacto usam um pool limitado a 20; cada feixe desenha no máximo 24 segmentos, com menos segmentos no modo reduzido. Os efeitos novos não acrescentam colisões. O brilho na origem do feixe foi reduzido para deixar a personagem visível. Taiyoken dissipa em 240 ms, com transparência e dimensão limitadas; as explosões também têm limite visual, sem reduzir a área de dano. Isto não é uma promessa de 60 FPS num Android físico.

## Ficheiros principais

- `src/combat-animation.js`, `src/animation.js`, `src/weapons.js`: arbitragem e amostragem dos ataques por fase, prioridades, recuperação e mãos.
- `src/enemies.js`, `src/motion.js`: sincronização dos contactos e feedback.
- `src/combat-fx.js`, `src/effects.js`, `src/render.js`, `src/sprites.js`: atlas animado, impacto com pooling e desenho limitado.
- `tools/repair-atlases.py`, `src/frame-data.js`, `assets/packed/animation/`: correção semântica das poses e âncoras.
- `tools/draw-combat-fx.py`, `assets/packed/effects/combat-fx.png`: fonte reproduzível e PNG original dos efeitos.
- `tests/combat-presentation.test.js`, `tools/combat-sequence.cjs`: regressões de concorrência, fases, movimento e evidência visual.
- `Dragon-Ball-Survivors.html`: distribuição offline atualizada; todos os módulos e 123 atlas embebidos.

## Validação

- **33 testes Node passaram.** Incluem integridade dos 3.920 frames corporais, oito desenhos distintos em cada estilo de efeito, arbitragem de ataques simultâneos, recuperação depois de dano, emissão de feixes, limite de impactos, contacto e estabilidade walk/run. Três ataques simultâneos mantêm os lançamentos e o mesmo dano a 30/60/120 passos por segundo.
- Sintaxe de todos os módulos e ferramentas JavaScript verificada.
- `browser-smoke.cjs`: seleção, combate, pausa, níveis, transformação, boss, vitória/derrota, armazenamento e joystick.
- `animation-smoke.cjs`: 960 amostras de poses, 14 sequências de técnicas em movimento, transformação e ambas as fases de Freeza.
- `verify-sprite-fix.cjs`: corrida de Goku nas quatro direções, ataque durante movimento com feixe ligado à mão, SSJ completo e regresso ao movimento; Saibaman a andar, preparar, atingir e morrer; controlo tátil Android. Inclui vídeo real.
- `combat-sequence.cjs`: capturas do renderer real para as cinco personagens em quatro direções, 15 lançamentos × cinco fases e os 27 marcos de transformação/evolução. Confirma que a pose visível e a fase de combate coincidem. Os testes usam cenários isolados para tornar a comparação reproduzível.

Ambientes: Chromium desktop e viewport Android 390×844 com eventos táteis. Não houve teste em telemóvel físico nem partida manual completa de 20 minutos. As capturas foram inspecionadas além dos testes de JavaScript.

## Ver o resultado

- [Cinco personagens em quatro direções](previews/five-character-movement.png).
- [Preparação → carga → lançamento → impacto → recuperação](previews/combat-phases.png).
- [Todos os marcos de transformação/evolução](previews/all-transformations.png).
- [Combate antes desta revisão](previews/combat-before.png) / [combate atual](previews/goku-moving-attack.png).
- [Vídeo do jogo real](previews/animation-fix.webm) e [viewport Android](previews/android-viewport.png).

Com o servidor ativo, executar os scripts de navegador com Playwright e Chromium instalados. `GAME_URL` e `CHROMIUM_PATH` configuram os caminhos. `tools/frame-review.html` permite rever individualmente as folhas de atores.

## O que continua provisório

**Esta revisão não conclui toda a arte necessária para a qualidade profissional pretendida.** Não foram desenhados novos corpos para todos os cruzamentos de técnica e transformação. Mantêm-se 45 folhas de combate/reação/assinatura que usam a guarda completa da forma, e 15 folhas de locomoção transformada que reutilizam os passos existentes. O manifesto identifica esses fallbacks. Algumas técnicas partilham a mesma família de poses; Cannon não tem ainda um desenho exclusivo dos dois dedos e o Taiyoken lateral precisa de poses mais específicas. Explosões partilham a família de expansão/dissipação, com variantes de cor.

Durante um ataque em movimento usa-se um frame corporal completo, sem juntar pernas de corrida a um tronco incompatível; faltam ciclos desenhados especificamente de corrida com ataque. Esta escolha evita deformações, mas ainda não oferece passada animada durante todas as técnicas. A animação normal retoma depois da recuperação. Algumas vistas são espelhadas e existem quatro direções. Esta limitação artística é explícita; a guarda estática não é apresentada como uma animação nova. As cinco personagens base e os inimigos conservam as suas sequências de poses completas e distintas.
