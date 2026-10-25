# Animação de corpo completo

## Problemas concretos encontrados

A inspeção de `src/sprites.js`, coordenadas e mestres mostrou que eliminar fragmentos de recorte não bastava: algumas poses laterais de Gohan, Krillin e Buu apontavam a mão no sentido oposto ao alvo; um carregamento frontal de Goku trocava o lado das mãos. As folhas de ação das transformações repetiam a guarda. Um lançamento parado durante a corrida deixava os pés aparentemente presos enquanto a posição avançava.

Foram rejeitadas experiências de composição de tronco e pernas que produziam mãos fantasma e buracos na roupa. Essas experiências não fazem parte do projeto. As correções finais selecionam apenas personagens completas, incluindo quando é necessário espelhar uma célula inteira.

## Alterações entregues

- `assets/pose-curation.json` e `tools/repair-atlases.py`: correções declarativas de orientação das células antigas, mantendo os mestres intactos.
- `assets/source/moving/`, `form-casts/`, `form-signatures/`: 62 novos mestres, 992 frames completos. As versões de execução correspondentes ficam em `assets/packed/`.
- `tools/pack-character-actions.py`: extrai atores completos por componentes alpha, exige 16 células, preserva os membros, quantiza a paleta e normaliza chão/âncora em células de 96×96. O relatório de proveniência e hashes está em `assets/action-art-report.json`.
- `src/action-frames.js`, `frame-metadata.js`: limites e mãos por frame. A saída dos ataques segue a mão do frame efetivamente desenhado.
- `src/animation.js`, `sprite-layout.js`: seleção de corpos completos de carregamento/lançamento, passada associada à distância real, marcha atrás e recuperação sem reiniciar os pés. Não se recortam partes do corpo para sobrepor animações.
- `src/animation-textures.js`, `sprites.js`: carregamento das texturas utilizadas, incluindo todos os sprites da próxima forma antes da troca. Folhas antigas redundantes de guarda deixam de ser carregadas quando há substitutas.

O sistema existente conserva prioridades, duração e transições de idle, walk, run, attack, charge, cast, hurt, knockback, transform e death. Não foram alterados dano, níveis, progressão, colisões, arena, controlos ou recordes nesta revisão. A transformação conserva preparação, crescimento da aura, flash, substituição integral da forma e recuperação. Os efeitos, antecipação dos inimigos, separação e pooling da versão anterior são preservados.

## Validação

`npm test`: 43 testes, sem falhas. A auditoria verifica os pixels reais dos PNG: componentes, bordas, limites, chão, mãos visíveis, quatro desenhos distintos das pernas por vista e integridade dos mestres. São 3.600 células anteriores de animação, 320 formas e 992 novas células de corpo.

Testes Chromium com o renderizador real, em desktop e viewport Android:

- `tools/moving-action-smoke.cjs`: técnicas em movimento, fases, formas e igualdade entre a origem real emitida e a mão visível; gera PNGs e vídeo Canvas.
- `tools/combat-sequence.cjs`: cinco personagens × quatro direções, 15 técnicas × cinco fases e 27 marcos de transformação/evolução.
- `tools/verify-sprite-fix.cjs`: Goku nas quatro direções, Kamehameha em movimento, troca completa SSJ, Saibaman a andar/antecipar/atacar/morrer e gesto tátil.
- `tools/animation-smoke.cjs` e `browser-smoke.cjs`: amostragem de estados, Freeza, controlos, pausa, subida de nível, resultados e persistência.

Inspeção visual dos atlas e capturas realizada além dos testes de sintaxe. As novas células não contêm fragmentos de corpos adjacentes; os testes de componentes e margem corroboram a inspeção. Evidência: [atlas de movimento](previews/moving-atlases.png), [assinaturas](previews/signature-atlases.png), [Goku](previews/goku-moving-phases.png), [formas](previews/transformed-cast-phases.png), [vídeo](previews/moving-combat.webm), [Android](previews/android-viewport.png).

## O que continua provisório

As transformações têm agora ataques e assinaturas próprios, mas as reações de dano/knockback/morte continuam a recorrer à guarda completa. Não se anuncia animação exclusiva onde há fallback. O carregamento das formas transformadas e o ataque durante deslocamento perpendicular usam a pose completa parada enquanto a posição continua a mover-se. O lançamento alinhado ou em marcha atrás usa as novas pernas animadas. Special Beam Cannon partilha a preparação à testa, sem pose exclusiva de dois dedos. Não há oito direções. A qualidade de alguns ciclos de locomoção/inimigos anteriores depende ainda dos seus mestres; não se promete acabamento comercial uniforme ou 60 FPS em todo o Android.

Não foram usados sprites comerciais. Os novos mestres foram produzidos pela ferramenta de criação de imagens e normalizados localmente; jogo e ferramentas de packing funcionam com os ficheiros incluídos, sem APIs ou serviços pagos. Não houve validação num Android físico nem partida manual integral de 20 minutos.
