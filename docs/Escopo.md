# Especificação da Linguagem e Escopo

A ideia inicial do projeto esta em um compilador basico da linguagem Javascript (ECMAScript TC39), para a linguagem Go (Golang), para definir o escopo precisamos primeiro entender como funciona cada linguagem, para isso temos a especificação de cada uma a seguir:

## Language Specification

- O documento que define o JavaScript é o [ECMAScript Language Specification](./ECMA-262_17th_edition_june_2026.pdf) (conhecido pelo código do padrão, ECMA-262).


- O documento oficial é chamado de The Go Programming Language Specification.
Ao contrário do C (que é regido pela ISO) ou do JavaScript (Ecma), o Go não é regido por um órgão externo de padronização. A especificação é mantida pela própria equipe do projeto Go (originada no Google e agora open source).
[go.dev/ref/spec](go.dev/ref/spec)


## Escopo

Este documento define o subconjunto estrito da linguagem JavaScript (ECMAScript) que será suportado pelo compilador para geração de código Go.

## 1. Tipos de Dados

Valores identificados de forma absoluta no código:

* **Number (`NUMERO`):** Reconhece números inteiros e decimais de ponto flutuante (ex: `10`, `3.14`). Expressão de captura: `/[0-9.]/`.
* **String (`STRING`):** Sequências de texto delimitadas por aspas simples ou duplas (ex: `"Olá Mundo"`, `'teste'`).
* **Boolean (`BOOLEAN`):** Reconhecimento estrito das palavras reservadas `true` e `false`.

## 2. Palavras-Chave

Palavras reservadas mapeadas e categorizadas com seus respectivos subtipos:

* **Declaração de Variáveis:** `let`, `const`, `var`
* **Controle de Fluxo e Repetição:** `if`, `else`, `while`, `for`
* **Funções e Retorno:** `function`, `return`

## 3. Identificadores 

Nomes atribuídos a variáveis, funções ou comandos nativos (como `console` e `log`).

* **Regra de Formação:** Devem iniciar com letra (a-z, A-Z) ou sublinhado (`_`), seguidos por letras, números ou sublinhados.

## 4. Operadores

| **Categoria** | **Operadores** |
| --- | --- |
| **Aritméticos** | `+`, `-`, `*`, `/`, `%` |
| **Atribuição** | `=`, `+=`, `-=` |
| **Relacionais** | `>`, `<`, `>=`, `<=`, `==`, `!=` |
| **Lógicos** | `&&`, ` |

## 5. Delimitadores e Pontuação 

Caracteres de estruturação de blocos, parâmetros e chamadas:

* **Suportados:** `{`, `}`, `(`, `)`, `,`, `;`, `.` 
* *(Nota: O ponto `.` é suportado nativamente para permitir a leitura de chamadas de métodos, essencial para o comando de I/O `console.log`).*

## 6. Estrutura e Fim de Arquivo

* **Caracteres Ignorados (Whitespace):** Espaços em branco, quebras de linha (`\n`), retorno de carro (`\r`) e tabulações (`\t`) são consumidos e descartados sem gerar tokens.
* **Término (`EOF`):** Ao final da leitura da cadeia de caracteres, o analisador injeta automaticamente o token `EOF` (End of File).

---
