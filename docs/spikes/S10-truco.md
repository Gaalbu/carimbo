# S10 — Truco: estrutura de checagens de 2014

Pesquisa em 4/11/2026. Resultado: **extrator adiado**. A página primária está acessível e mostra a sequência de alegações e cartas, mas esta investigação não confirmou o texto dos vereditos nas imagens. Não é seguro transformá-los em rótulos a partir dos nomes dos arquivos.

## Evidência observada

- A [edição nº 6](https://apublica.org/checagem/2014/08/truco-programa-6/) respondeu HTTP 200 ao acesso direto. Dentro de `#entry-content-wrap`, começa com o desafio “Truco, Marina!”, uma imagem `truco3.png`, a frase e perguntas à campanha; o texto registra resposta em 10 de setembro. Esse trecho não deve ser confundido automaticamente com uma checagem dotada de veredito.
- Após essa resposta, o HTML traz uma imagem cujo caminho termina em `tá-certo-mas-perai-dilma3.png`, com `alt=""`, seguida de um `h1` com a declaração sobre R$ 143 bilhões em obras e de parágrafos de análise. Em seguida, após análise, infográfico e resposta do ministério, aparece outra imagem, `não-é-bem-assim-pastor-everaldo4.png`, também com `alt=""`, dentro de um `h1`; o `h1` seguinte contém uma declaração de Pastor Everaldo. Mais adiante há outra imagem `não-é-bem-assim-dilma4.png` com `alt=""`, seguida da declaração sobre o Trensurb. A estrutura sugere uma carta antes de cada alegação, mas os nomes das imagens, por si só, não comprovam os rótulos literais nem uma regra geral de associação.
- A tentativa de acessar diretamente a primeira carta pelo `src` fornecido no HTML (`https://i0.wp.com/apublica.org/wp-content/uploads/2014/08/t%C3%A1-certo-mas-perai-dilma3.png?resize=640%2C538`) retornou HTTP 400, com mensagem de erro. Não foi tentado contornar a resposta. Portanto, o conteúdo visual da carta não foi conferido nesta investigação.
- A [página 14 da listagem de checagens](https://apublica.org/checagem/page/14/) inclui os programas #1 a #16 e também “Rodada de promessas”. A entrada do programa #6 resume o desafio e a resposta, não o conjunto de vereditos. A listagem mistura formatos e não é uma fonte suficiente de pares alegação/veredito.
- O [especial Truco 2014](https://apublica.org/especial/truco2014/) descreve cartas e diferencia desafios, checagens e reportagens; também lista o programa #6. Suas descrições gerais das categorias não demonstram qual carta foi atribuída a cada alegação da edição.

## Lacunas e próximo passo

É necessário obter, por via autorizada e sem contornar bloqueios, uma representação legível de cada carta e confirmar literalmente o selo e sua relação com a alegação. Depois, inspecionar outras edições e variações de layout, distinguir imagens editoriais e infográficos de cartas, e definir tratamento de desafio, respostas e casos ambíguos. Somente com exemplos verificáveis deve-se construir fixture e testes de extração; casos sem evidência devem permanecer sem rótulo. Esta amostra não estabelece cobertura completa do arquivo nem a primeira checagem publicada.
