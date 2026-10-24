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

Linhas: sul, oeste, este, norte. Coluna 0: repouso; 1: passo; 2: posição intermédia; 3: passo oposto. Idle alterna 0 e 2 lentamente, com respiração; caminhada usa 1/2/3 a 9 frames/s. As evoluções de Buu/Krillin mantêm o sprite físico e usam as auras/efeitos existentes, respeitando as técnicas do jogo.

A folha de inimigos tem linhas: Saibaman, soldado, Guldo, Recoome, Burter, Jeice, Ginyu, Freeza fase 1 e Freeza fase 2. Os originais têm espaçamento vertical irregular; `tools/pack-assets.cjs` e o modo raw de `sprites.js` normalizam esses recortes para uma grelha regular.

## Reprodução técnica

Com o servidor local ativo e as dependências opcionais de testes instaladas, executar `node tools/pack-assets.cjs` a partir do projeto. O processo conserva os originais, recorta as células, alinha os pés e exporta PNG menores sem suavização. Não há dependências externas no jogo publicado.

Os sprites gerados foram inspecionados em jogo e na galeria; o projeto não promete a revisão manual de cada pixel ou a fidelidade a animações de episódios. Todas as transformações físicas têm ficheiros próprios em vez de simples filtros de cor aplicados ao corpo inteiro.
