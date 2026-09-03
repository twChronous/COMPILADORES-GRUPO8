# Arquitetura

Este documento apresenta a arquitetura básica do compilador desenvolvido pelo
Grupo 8. O projeto tem como objetivo traduzir um subconjunto da linguagem
JavaScript, conforme o padrão ECMAScript, para código equivalente em Go.

## Visão geral

O compilador será organizado em etapas sequenciais. Cada etapa recebe a saída
da etapa anterior, realiza uma transformação ou validação e encaminha o
resultado para a próxima fase:

```text
Código-fonte JavaScript
		  |
		  v
Analisador léxico (tokens)
		  |
		  v
Analisador sintático (AST)
		  |
		  v
Analisador semântico (AST validada)
		  |
		  v
Representação intermediária (IR)
		  |
		  v
Otimizador
		  |
		  v
Gerador de código Go
		  |
		  v
Código-fonte Go
```

O fluxo deve interromper a compilação quando forem encontrados erros léxicos,
sintáticos ou semânticos. As mensagens de erro devem indicar, sempre que
possível, a posição do problema no código-fonte para facilitar a correção.

## Componentes principais

### Analisador léxico

Lê o código-fonte caractere por caractere e o transforma em uma sequência de
tokens, como identificadores, palavras-chave, operadores, literais e
delimitadores. Também é responsável por identificar caracteres ou sequências
inválidas.

### Analisador sintático

Consome os tokens e verifica se eles obedecem à gramática definida para o
subconjunto de JavaScript adotado pelo projeto. Como resultado, constrói uma
Árvore Sintática Abstrata (AST), que representa a estrutura do programa.

### Analisador semântico

Verifica regras que não podem ser validadas apenas pela gramática, incluindo
declaração e uso de identificadores, escopos e compatibilidade das operações.
Essa etapa também prepara informações necessárias para a geração de Go.

### Representação intermediária e otimização

A representação intermediária (IR) fornece uma forma independente da sintaxe
de JavaScript e de Go para descrever as operações do programa. O otimizador
poderá transformar essa representação para reduzir operações desnecessárias e
melhorar o código gerado.

### Gerador de código

Converte a IR, ou a AST validada quando aplicável, em código-fonte Go. O código
gerado deve respeitar a sintaxe da linguagem de destino e preservar o
comportamento previsto para o programa JavaScript dentro do escopo definido.

## Fluxo de dados

O ponto de entrada do compilador recebe um arquivo JavaScript e coordena a
execução das etapas. Cada fase deve possuir uma responsabilidade bem definida
e uma interface simples com a fase seguinte, permitindo testar os componentes
de forma isolada e substituir uma implementação sem alterar todo o sistema.

Detalhes da gramática, das construções suportadas e das decisões de tradução
serão especificados nos documentos de escopo e de especificação da linguagem.


## Estrutura do projeto

```text
├── README.md
├── bun.lock 
├── docs - Pasta onde está a documentação tecnica do projeto
│   ├── Arquitetura.md
│   ├── ECMA-262_17th_edition_june_2026.pdf
│   ├── Escopo.md
│   ├── README.md
│   └── _config.yml
├── node_modules - Pasta onde se encontram os pacotes necessarios para executar o projeto
├── package.json - Arquivo padrão de definições de projeto JS
├── src - Pasta onde o codigo em si é mantido
│   ├── Compiler.ts - Arquivo principal do compilador
│   ├── analyzers - Pasta onde se encontram os analizadores do compilador
│   ├── index.ts - Arquivo de EXECUÇÃO do compilador
│   ├── loaders - Pasta onde se encontram os loaders, que carregam os analizadores, geradores e etc
│   ├── models - Pasta onde se encontram classes "modelos"
│   └── utils - Pasta de utilitarios de codigo, funções repetitivas, tipagens, entre outros
└── tsconfig.json - Arquivo padrão de configuração do compilador do TypeScript
```
