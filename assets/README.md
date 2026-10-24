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

## Reprodução técnica

Com o servidor local ativo e as dependências opcionais de testes instaladas, executar `node tools/pack-assets.cjs` a partir do projeto. O processo conserva os originais, recorta as células, alinha os pés e exporta PNG menores sem suavização. Não há dependências externas no jogo publicado.

Os sprites gerados foram inspecionados em jogo e na galeria; o projeto não promete a revisão manual de cada pixel ou a fidelidade a animações de episódios. Todas as transformações físicas têm ficheiros próprios em vez de simples filtros de cor aplicados ao corpo inteiro.

## Animações de combate (revisão atual)

`source/animation/` contém novos mestres de idle/corrida, carga/ataque/cast, reação/transformação/morte e técnicas de assinatura. `source/effects/auras.png` contém seis estilos de aura e dois efeitos de feixe. São poses novas desenhadas pela geração de imagem para este projeto, não deslocamentos de um sprite estático.

`animation-layouts.json` corrige linhas irregulares ou omitidas pelos mestres; as vistas laterais em falta são espelhadas. Vegeta/reaction tem a grelha transposta na origem e é reorganizado no packing. As assinaturas Genki Dama, Final Flash, Masenko, Planet Burst e Kienzan têm folhas específicas. `animation-manifest.json` descreve 99 texturas derivadas. As formas partilham a anatomia/poses por personagem, com remapeamento de cabelo e camadas de silhueta para SSJ3/Beast. Nem todas as variantes de forma/técnica foram redesenhadas individualmente à mão.

O ciclo de caminhada anterior de três frames continua a servir a marcha lenta; os novos ciclos de corrida têm quatro frames. Agora todos avançam pela distância real do ator. Idle tem frames próprios e não reutiliza a caminhada. Reações usam dois frames para hurt e dois diferentes para knockback; morte usa uma sequência de quatro poses. O apoio é alinhado à linha 84 da célula; cadáveres usam a pose caída sem rodar o corpo em Canvas.
