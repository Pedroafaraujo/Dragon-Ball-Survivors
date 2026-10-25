# Recursos visuais originais

Estas imagens foram criadas especificamente para Dragon Ball Survivors com geração de imagem assistida por IA. Não são sprites extraídos de jogos comerciais nem recursos obtidos de bancos externos. O estilo pretendido é pixel art de RPG de ação da era Game Boy Advance, com roupa, cabelo, sombras e poses próprias. As fontes de maior resolução estão conservadas aqui sem alterações; a normalização técnica é reproduzível.

## Pastas

- `source/sprites/`: 20 folhas de personagens/formas, cada uma com 16 poses; `enemies.png` tem 36 poses em nove linhas.
- `source/tiles/namek.png`: quatro terrenos de erva, dois lagos, areia, água, quatro rochas e quatro árvores.
- `source/effects/ki.png`: quatro frames de Ki, quatro de Kienzan, quatro de explosão e quatro de aura.
- `packed/`: versões PNG RGBA prontas para o jogo, com células de 96 × 96. São estas as imagens usadas no navegador.
- `manifest.json`: caminhos, dimensões de célula, número de linhas e frames de cada atlas.

## Personagens

| Prefixo    | Ficheiros / formas físicas           |
| ---------- | ------------------------------------ |
| `goku-`    | base, ssj, ssj2, ssj3, god, blue, ui |
| `vegeta-`  | base, ssj, ssj2, god, blue, ue       |
| `gohan-`   | base, ssj, ssj2, ultimate, beast     |
| `krillin-` | base; sem Super Saiyan               |
| `buu-`     | base; sem formas físicas inventadas  |

Nas folhas de base antigas: linhas sul, oeste, este, norte. Coluna 0: repouso; 1: passo; 2: posição intermédia; 3: passo oposto. Na versão antiga, idle alternava 0/2 pelo relógio global. A revisão atual usa idle próprio e marcha/corrida pela distância real, como descrito abaixo. As evoluções de Buu/Krillin mantêm o sprite físico e usam as auras/efeitos existentes, respeitando as técnicas do jogo.

A folha de inimigos tem linhas: Saibaman, soldado, Guldo, Recoome, Burter, Jeice, Ginyu, Freeza fase 1 e Freeza fase 2. Os originais têm espaçamento vertical irregular; `tools/pack-assets.cjs` e o modo raw de `sprites.js` normalizam esses recortes para uma grelha regular.

## Reprodução e correção dos atlas

Executar `python3 -m pip install -r tools/requirements-assets.txt` e `python3 tools/repair-atlases.py`, seguido de `python3 tools/draw-combat-fx.py`. O jogo publicado continua sem dependências de instalação. As fontes originais ficam intactas; os hashes e a proveniência de cada extração estão em `atlas-repair-report.json`.

Os mestres de `source/animation/` têm espaçamento irregular. O reparador identifica atores completos por componentes de alpha; os raros atores encostados são separados com referências das restantes colunas. Alinha o eixo do corpo e o chão a 84/96. Não recorta pela divisão uniforme da largura, não combina troncos/pernas e não compõe cabelo.

`animation-manifest.json` descreve 100 folhas: 98 de atores, uma de auras e uma de efeitos de combate. O campo `artStatus` distingue 38 folhas de poses base/inimigos, 15 de locomoção de formas completas e 45 de guarda completa provisória para ações sem arte própria. A guarda não é apresentada como animação de combate exclusiva. Cada transformação preserva o seu modelo completo original. Buu/Burter/Jeice reutilizam os passos frontais existentes onde faltava corrida frontal; Ginyu tem as linhas laterais corrigidas.

`../src/frame-data.js` guarda bounds, chão e mãos por frame. Os testes verificam 3.600 células de animação e 320 de formas: um ator conectado, margem livre e nenhum pixel abaixo do chão. Isso detecta os fragmentos anteriores, mas não substitui revisão artística. As pré-visualizações antes/depois e o vídeo real do navegador estão em `../docs/previews/`; `../tools/frame-review.html` permite inspecionar todas as células individualmente.

## Atlas de efeitos de combate

`packed/effects/combat-fx.png` é desenhado por `tools/draw-combat-fx.py` com Pillow, sem IA remota, APIs ou downloads. Tem 144 frames (18 estilos × oito), a 48 pixels lógicos exportados em 96×96 por nearest-neighbor. Inclui texturas de feixe azul/violeta/dourado, hélice, esferas distintas, discos, braço elástico, flash, impactos e explosões com variantes azul e magenta. Cada estilo tem oito desenhos diferentes; isso é verificado nos testes. Não são novas animações de corpos. As correções de poses laterais e recuperação reutilizam frames completos do mesmo personagem, nunca membros sobrepostos.
