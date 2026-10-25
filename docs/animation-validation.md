# Validação da correção de sprites e transições

## Causas e alterações

O diagnóstico foi realizado antes da alteração: [relatório](animation-diagnosis.md). Os fragmentos já estavam nos PNG por recortes uniformes de fontes irregulares. A centralização pela caixa total deslocava o corpo quando os braços mudavam; o renderer ainda combinava pernas e troncos incompatíveis. As variantes de cabelo compostas agravavam o defeito.

- `tools/repair-atlases.py`, `assets/packed/animation/`, `assets/packed/sprites/`: extração de atores completos, alinhamento ao eixo do corpo/chão e remoção dos recortes contaminados. Fontes originais preservadas. Relatório de proveniência em `assets/atlas-repair-report.json`.
- `src/sprites.js`, `src/sprite-layout.js`, `src/frame-data.js`: uma única pose completa por ator; recortes validados e mãos medidas na pose efetivamente desenhada.
- `src/animation.js`, `src/motion.js`, `src/transformations.js`: sequência de preparação, crescimento de aura, flash breve, troca completa e recuperação; troca aguarda os recursos e não sobrepõe cabelo. Ciclo de marcha com posição de passagem entre passos opostos; fase baseada na distância.
- `src/main.js`, `src/render.js`, `src/weapons.js`, `src/ui.js`: relógios atualizados antes dos emissores, origem do feixe na mão da pose atual, novos lançamentos suspensos durante transformação, HUD e corpo mudam juntos.
- Correções de direção: corrida frontal de Goku/Krillin deixa de usar poses laterais; Buu/Burter/Jeice reutilizam passos frontais completos onde o mestre omite essa corrida; laterais de Ginyu corrigidas.

Não foram alterados personagens, progressão, valores de dano, colisões ou cenário. A interrupção breve da transformação é intencional, conforme pedido. Nenhuma API foi utilizada nesta correção.

## Testes executados

- `npm test`: **23/23** passaram. Inclui análise dos pixels de **3.600 frames de animação + 320 frames das formas completas**: um ator conectado por célula, margens livres, nenhum pixel abaixo do chão e limites/mãos coerentes com metadados. Grelhas são 96×96, quatro colunas. Estas verificações detetam fragmentos, mas não provam qualidade artística de cada pixel.
- Verificação de sintaxe de todos os módulos JS e ferramentas CJS/MJS.
- Exportação `Dragon-Ball-Survivors.html` regenerada com 122 atlas PNG embebidos e testada em Chromium sem servidor: inicia o jogo e mostra o HUD sem exceções.
- `tools/browser-smoke.cjs`: movimento, pausa, níveis, transformação, boss, vitória/derrota, seleção, armazenamento e joystick.
- `tools/animation-smoke.cjs`: 960 amostras das cinco personagens/inimigos, 14 linhas temporais de técnicas, transformação, Freeza nas duas fases e viewport Android; sem PNG em falta ou exceções.
- `tools/verify-sprite-fix.cjs`: comparação pixel a pixel entre o renderer e uma única célula completa para 12 combinações direção/ataque em movimento; rejeita qualquer recorte por `clip`. Verifica também um inimigo completo, quatro direções de corrida de Goku, feixe sincronizado com a mão, troca integral para SSJ, imobilidade breve e regresso ao movimento, Saibaman a andar/preparar/atingir/morrer, joystick e paragem em viewport Android.

Chromium desktop: 640×480, DPR 2. Viewport Android: 390×844, DPR 2 e eventos táteis. Não equivale a teste num dispositivo Android físico. Não foi jogada manualmente uma partida inteira de 20 minutos.

## Evidência visual

As folhas corrigidas, capturas e frames do vídeo foram inspecionados visualmente além dos testes de JavaScript.

- [Vídeo real do Canvas](previews/animation-fix.webm): corrida nas quatro direções, Kamehameha em movimento, preparação/carga/flash/SSJ/recuperação e Saibaman.
- [Corrida — antes](previews/goku-motion-before.png) / [depois](previews/goku-motion-after.png).
- [Genki Dama — antes](previews/goku-signature-before.png) / [depois](previews/goku-signature-after.png).
- [SSJ3 — antes](previews/goku-ssj3-motion-before.png) / [depois](previews/goku-ssj3-motion-after.png).
- [Saibaman — antes](previews/enemy-saibaman-motion-before.png) / [depois](previews/enemy-saibaman-motion-after.png).
- [Ataque durante movimento](previews/goku-moving-attack.png), [carga da transformação](previews/ssj-charge.png), [corpo SSJ completo](previews/ssj-complete-body.png), [regresso ao movimento](previews/ssj-return-to-movement.png), [viewport Android](previews/android-viewport.png).

Para reproduzir: servidor local, Playwright + Chromium instalados; `GAME_URL=http://127.0.0.1:8000 node tools/verify-sprite-fix.cjs`. A ferramenta gera novamente o vídeo e as capturas. `tools/frame-review.html` permite inspecionar as 98 folhas de atores, cada célula e as suas âncoras. As auras existentes foram mantidas.

## O que continua provisório

Não foram criadas poses inéditas para todas as combinações de forma e ataque. O manifesto distingue 38 folhas de poses base/inimigos, 15 de locomoção de formas completas e **45 folhas provisórias que repetem a guarda completa da forma** para combate/reação/assinatura. São fallbacks explícitos; não são anunciadas como novas animações exclusivas. As formas preservam o modelo completo original, incluindo cabelo e roupa, sem recoloração do corpo base ou montagem de partes. As cinco personagens base e os inimigos usam os frames de ação completos recuperados dos mestres. Alguns movimentos laterais são espelhados; as formas transformadas reutilizam a caminhada existente na corrida. Continuam a precisar de trabalho artístico para atingir a mesma riqueza de poses das formas base.
