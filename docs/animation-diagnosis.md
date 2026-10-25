# Diagnóstico anterior às correções

Revisão feita antes de modificar o código do jogo ou os PNG. Foram examinados `src/sprites.js`, o controlador, renderer, empacotadores, movimento e transformações, além de **todos os 3.600 frames das 98 folhas em `assets/packed/animation/`**. A auditoria automática individualizou cada célula, mediu os componentes, limites, chão e grelha. A revisão visual cobriu as 44 topologias distintas (as restantes partilham máscaras e diferem na paleta), com ampliações dos defeitos.

## Resultados concretos

- Todas as imagens tinham largura 384 e altura múltipla de 96. Nenhum pixel tocava o limite exterior da sua célula: o erro não era sangramento do `drawImage` entre células de execução.
- 896 frames tinham componentes separados de pelo menos seis pixels a rever; 12 tinham pixels abaixo da linha de chão declarada. Nem todo componente isolado é necessariamente um erro, mas os exemplos ampliados confirmaram corpos vizinhos dentro da mesma célula.
- `goku-motion`, linha 4, colunas 1/2: partes de sprites laterais junto do corredor. `buu-motion`: corpos laterais cortados e fragmentos nas margens. `goku-signature`, linha 3: pernas de outra linha por cima de Goku. `enemy-recoome-combat`, linha 9: duas poses caídas na mesma célula. `enemy-jeice-motion`: linhas praticamente vazias ou cabeças sem corpo.
- `pack-animation.cjs` recortava `round(col * width / 4)` e linhas estimadas; os mestres não têm esse espaçamento uniforme. O problema foi gravado nos PNG finais. Reduzir simplesmente o retângulo de execução não recupera o corpo cortado.
- O tamanho era definido pelo maior recorte da folha. Um recorte contendo dois atores encolhia todos os outros. Cada recorte era centrado pela largura total: estender um braço deslocava também o corpo.
- `drawFighter` e `drawEnemySprite` juntavam pernas de locomoção e tronco de combate a uma altura fixa (60/96), apesar de poses, escala, direção e posição das ancas diferentes.
- O empacotador recoloria retângulos e, para SSJ3/Beast, acrescentava pixels selecionados por cor de outro atlas. Não havia separação semântica de cabelo/roupa nem âncora de cabeça adequada: fragmentos dourados/prateados eram gravados ao redor dos corpos.
- As transformações mudavam os atributos imediatamente e escolhiam a forma visual pela metade do tempo do clip, sem garantir o carregamento do atlas. A mistura de partes continuava durante a transformação; o fallback podia ainda mostrar o corpo base.
- Testes anteriores validavam dimensões e diferenças de imagens, não integridade anatómica ou corpo único por frame. Portanto, eram insuficientes para estes defeitos.

## Correção orientada pelo diagnóstico

Extrair componentes completos dos mestres, separar as poucas poses encostadas com referências das outras colunas e normalizar por chão e eixo do corpo. Não voltar a inferir cortes pela divisão uniforme do ficheiro. Preservar os mestres sem alterações. Produzir metadados por frame e verificar novamente os PNG finais. Usar uma pose completa, com estados e direção estáveis, até existirem verdadeiras camadas compatíveis. Na transformação, carregar o alvo antes da troca e substituir pelo sprite completo existente da forma, sem colar cabelo ou outras partes durante a execução.

## Resultado depois da correção

A reconstrução identifica o ator completo e regista a proveniência, os raros cortes de componentes encostados e o hash de cada mestre em `assets/atlas-repair-report.json`. As fontes não foram modificadas. A auditoria final das 3.600 células de animação e 320 de formas completas encontrou zero fragmentos desconectados, zero pixels nas bordas e zero pixels abaixo do chão. Foram corrigidas ainda as direções laterais de Ginyu e os mestres sem corrida frontal de Buu/Burter/Jeice, usando passos frontais completos existentes. As limitações de poses transformadas e os testes visuais estão em [animation-validation.md](animation-validation.md).
