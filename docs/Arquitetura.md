# Arquitetura

Este documento apresenta a arquitetura básica do compilador desenvolvido pelo Grupo 8. O projeto tem o objetivo de traduzir um subconjunto da linguagem JavaScript (padrão ECMAScript) para código equivalente na linguagem Go.

## Visão geral

O compilador opera em etapas sequenciais e utiliza uma Interface de Linha de Comando (CLI) para gerenciar a execução. Cada etapa recebe a saída da etapa anterior, aplica uma transformação ou validação e encaminha o resultado para a próxima fase:

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
Analisador semântico (Tabela de Símbolos e AST validada)
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

O fluxo registra e reporta falhas léxicas, sintáticas ou semânticas. O sistema anota a linha e a coluna exatas de cada erro no código-fonte para facilitar a correção por parte do usuário. Em caso de falha crítica sem recuperação, o sistema interrompe a compilação.

## Componentes principais

### Analisador Léxico

Lê o código-fonte caractere por caractere e o transforma em uma matriz de tokens (identificadores, palavras-chave, operadores, literais e delimitadores). O Analisador Léxico registra a linha e a coluna exatas de cada token. Isso fornece rastreabilidade estrutural para as etapas seguintes. Ele também identifica caracteres não pertencentes à linguagem.

### Analisador Sintático

Consome os tokens estruturados e verifica a conformidade com a gramática do subconjunto JavaScript.

* **AST:** O analisador constrói uma Árvore Sintática Abstrata (AST). O sistema usa Uniões Discriminadas (*Discriminated Unions*) do TypeScript para garantir a tipagem estrita de cada nó da árvore.
* **Precedência:** Implementa a avaliação correta de precedência matemática e lógica.
* **Recuperação de Erros:** O analisador implementa o *Panic Mode*. Este modo captura erros locais, sincroniza a leitura no próximo delimitador seguro (como `;` ou `}`) e continua a análise. Isso permite relatar múltiplos erros de sintaxe em uma única execução.

### Analisador Semântico

Verifica regras de contexto que a gramática não consegue validar sozinha.

* **Escopo:** O analisador usa uma pilha de tabelas Hash (*Stack of Maps*) para isolar os blocos de código e gerenciar o sombreamento de variáveis.
* **Validação:** Ele infere os tipos de dados e garante a imutabilidade correta de variáveis marcadas como `const`.
* **Tabela de Símbolos:** A etapa produz uma Tabela de Símbolos persistente. Esta tabela guarda os metadados (nome, modificador, tipo inferido, nível de escopo e localização) de todas as variáveis declaradas.

### Representação Intermediária (IR) e Otimização

A representação intermediária (IR) descreve as operações do programa de forma independente da sintaxe do JavaScript ou do Go. O otimizador utiliza esta IR para remover operações desnecessárias e otimizar o código final.

### Gerador de Código

Converte a representação intermediária (ou a AST validada) em código-fonte Go. O código gerado respeita a sintaxe e as restrições estáticas da linguagem Go, mas preserva a lógica comportamental do programa JavaScript original.

## Orquestração e Fluxo de Dados

A classe principal `Compiler` orquestra a execução das etapas do compilador. Ela utiliza carregadores dinâmicos (*Loaders*) para instanciar os analisadores de forma encapsulada.

O arquivo `index.ts` serve como ponto de entrada via terminal (CLI). O usuário interage com o compilador passando o arquivo fonte e parâmetros opcionais, como `--verbose` (para ver os logs de execução), `--ast` (para imprimir a árvore gerada) e `--symbols` (para consultar a Tabela de Símbolos final).

Detalhes das construções suportadas e as regras de tradução estão disponíveis nos documentos de *Escopo* e *Especificação da Linguagem*.

## Estrutura do projeto

```text
├── bun.lock
├── Dockerfile
├── docs - Pasta de documentação técnica do projeto
│   ├── Arquitetura.md - Este documento
│   ├── assets - Estilizações da documentação online
│   │   └── css
│   │       └── style.scss
│   ├── _config.yml - Configurações do GitHub Pages
│   ├── ECMA-262_17th_edition_june_2026.pdf - Especificação técnica do ECMAScript
│   ├── Escopo.md - Documentação das limitações e capacidades do projeto
│   ├── README.md - Menu principal da documentação
│   └── Testes.md - Documentação de testes e cobertura
├── package.json - Arquivo de definições do ecossistema Node/Bun
├── README.md
├── src - Pasta principal do código-fonte do compilador
│   ├── analyzers - Pasta que armazena os analisadores do sistema
│   │   ├── Lexycal.analyzer.spec.ts - Testes automatizados do Analisador Léxico
│   │   ├── Lexycal.analyzer.ts - Código do Analisador Léxico
│   │   ├── Semantical.analyzer.spec.ts - Testes automatizados do Analisador Semântico
│   │   ├── Semantical.analyzer.ts - Código do Analisador Semântico
│   │   ├── Syntactic.analyzer.spec.ts - Testes automatizados do Analisador Sintático
│   │   └── Syntactic.analyzer.ts - Código do Analisador Sintático
│   ├── Compiler.ts - Classe orquestradora principal do compilador
│   ├── index.ts - CLI e ponto de execução no terminal
│   ├── loaders - Carregadores que instanciam os módulos dinamicamente
│   │   ├── Analyzers.loader.ts - Carregador específico dos analisadores
│   │   └── index.ts - Exportador central dos loaders
│   ├── models - Pasta para classes e modelos abstratos
│   │   └── Analyzer.model.ts - Modelo base estendido por todos os analisadores
│   └── utils - Pasta para utilitários, funções repetitivas e estruturas de dados
│       ├── types.ts - Definição das interfaces estritas e Uniões Discriminadas da AST
│       └── wordlist.ts - Definição do dicionário de palavras reservadas e tokens
├── tsconfig.json - Configuração estrita do compilador TypeScript
└── typedoc.json - Configuração do gerador de documentação automatizada

```

## Estruturas de dados principais

Para garantir a previsibilidade na transição de dados entre as fases, o compilador utiliza tipagem estrita baseada em Uniões Discriminadas (*Discriminated Unions*).

### Árvore Sintática Abstrata (AST)

A AST é o contrato de saída do Analisador Sintático e de entrada do Analisador Semântico. Todos os nós herdam coordenadas de rastreabilidade (linha e coluna) e são divididos em dois grandes grupos:

* **Statements (Comandos):** Representam ações completas no código, como declarações de variáveis (`let x = 1`), blocos de controle (`if/else`) ou expressões avulsas.
* **Expressões (Valores):** Representam computações que produzem um valor, como literais (`10`, `"texto"`), identificadores (`x`) e operações binárias (`x + 1`).

**Modelo simplificado:**

```typescript
interface BaseNode {
  linha: number;
  coluna: number;
}

type NoStatement = NoDeclaracaoVariavel | NoDeclaracaoIf | NoExpressaoStatement;
type NoExpressao = NoLiteral | NoIdentificador | NoExpressaoBinaria;

```

### Tabela de Símbolos

A Tabela de Símbolos é o artefato central gerado pelo Analisador Semântico. Ela mantém o registro de todos os identificadores (variáveis e constantes) validados no programa e seu escopo de pertencimento.

**Modelo do Símbolo:**

```typescript
interface Simbolo {
  nome: string;                            // Identificador da variável
  modificador: "let" | "const" | "var";    // Regra de mutabilidade
  tipo: "number" | "string" | "boolean";   // Tipo de dado inferido
  linhaDeclaracao: number;                 // Origem da declaração
  escopo: string;                          // Nível de isolamento (ex: "Global", "Bloco-1")
}

```

### Contexto Central de Compilação (Client Interface)

O compilador utiliza uma interface central para compartilhar dados entre todas as fases. Este objeto armazena o estado atual da compilação e fornece métodos padronizados para o registro de eventos e erros.

**Modelo do Contexto:**

```typescript
export interface ClientInterface {
  // Estado da Compilação
  tokens: lexicTokens[];               // Saída do analisador léxico
  ast?: NoStatement[];                 // Saída do analisador sintático/semântico
  tabelaSimbolos?: Simbolo[];          // Saída do analisador semântico
  errosSintaticos?: string[];          // Histórico de erros sintáticos e semânticos

  // Gerenciamento de Módulos
  analyzers: AnalyzerModelOptions[];   // Lista de analisadores instanciados

  // Métodos de Monitoramento
  LOG(...args: string[]): void;
  LOG_ERR(...args: string[]): void;
  LOG_WARN(...args: string[]): void;
  Error(...args: string[]): void;
}

```

**Responsabilidades principais:**

* **Armazenamento de Progresso:** As propriedades `tokens`, `ast` e `tabelaSimbolos` atuam como pontos de passagem. O Analisador Léxico preenche os tokens; o Sintático consome os tokens e gera a AST; e o Semântico consome a AST para gerar a Tabela de Símbolos.
* **Orquestração de Falhas:** A lista `errosSintaticos` acumula as falhas recuperadas pelo *Panic Mode*. O sistema só interrompe a execução e exibe o relatório de erros após a conclusão da etapa.
* **Monitoramento Padronizado:** Os métodos de `LOG` centralizam a saída no terminal. A classe orquestradora decide se exibe ou oculta essas mensagens com base nas *flags* acionadas pelo usuário no momento da execução (ex: `--verbose`).