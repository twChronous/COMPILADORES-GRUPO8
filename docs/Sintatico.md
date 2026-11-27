# Analisador Sintático

Este documento descreve as construções reconhecidas pelo analisador sintático (`src/analyzers/Syntactic.analyzer.ts`), a gramática adotada, a precedência de operadores e a forma dos nós da AST (`src/utils/types.ts`).

O analisador recebe a lista de tokens produzida pelo analisador léxico e constrói a **Árvore Sintática Abstrata (AST)**, que fica em `client.ast`. A AST é consumida depois pelo [analisador semântico](Semantico.md).

O método usado é a **descida recursiva** (um método `parseXxx()` por regra da gramática), com recuperação de erros em **Panic Mode**.

## 1. Construções suportadas

| Construção | Exemplo | Nó da AST |
| --- | --- | --- |
| Declaração de variável | `let x = 1;` | `DeclaracaoVariavel` |
| Condicional | `if (x > 1) { } else { }` | `DeclaracaoIf` |
| Laço `while` | `while (x < 10) { }` | `DeclaracaoWhile` |
| Laço `for` | `for (let i = 0; i < 3; i += 1) { }` | `DeclaracaoFor` |
| Declaração de função | `function soma(a, b) { }` | `DeclaracaoFuncao` |
| Retorno | `return a + b;` | `ReturnStatement` |
| Interrupção de laço | `break;` | `BreakStatement` |
| Salto de iteração | `continue;` | `ContinueStatement` |
| Bloco | `{ ... }` | `Bloco` |
| Expressão como comando | `x = 1;`, `console.log(x);` | `ExpressaoStatement` |

O `;` final é **opcional** nos comandos, exceto dentro do cabeçalho do `for`, onde os dois `;` são obrigatórios.

## 2. Gramática

Notação: `A?` é opcional, `A*` é zero ou mais, `A | B` é alternativa. Palavras entre aspas são tokens literais.

```text
Programa        → Statement* EOF

Statement       → DeclaracaoVar
                | DeclaracaoIf
                | DeclaracaoWhile
                | DeclaracaoFor
                | DeclaracaoFuncao
                | Return
                | Break
                | Continue
                | ExpressaoStmt

DeclaracaoVar   → ("let" | "const" | "var") IDENTIFICADOR "=" Expressao ";"?
DeclaracaoIf    → "if" "(" Expressao ")" Bloco ( "else" Bloco )?
DeclaracaoWhile → "while" "(" Expressao ")" Bloco
DeclaracaoFor   → "for" "(" ForInit Expressao? ";" Expressao? ")" Bloco
ForInit         → ("let" | "const" | "var") IDENTIFICADOR "=" Expressao ";"
                | Expressao ";"
                | ";"
DeclaracaoFuncao→ "function" IDENTIFICADOR "(" Parametros? ")" Bloco
Parametros      → IDENTIFICADOR ( "," IDENTIFICADOR )*
Return          → "return" Expressao? ";"?
Break           → "break" ";"?
Continue        → "continue" ";"?
ExpressaoStmt   → Expressao ";"?
Bloco           → "{" Statement* "}"
```

### Expressões (da menor para a maior precedência)

```text
Expressao       → Ou ( ("=" | "+=" | "-=") Expressao )?
Ou              → E ( "||" E )*
E               → Igualdade ( "&&" Igualdade )*
Igualdade       → Relacional ( ("==" | "!=") Relacional )*
Relacional      → Termo ( (">" | "<" | ">=" | "<=") Termo )*
Termo           → Fator ( ("+" | "-") Fator )*
Fator           → MembroOuChamada ( ("*" | "/" | "%") MembroOuChamada )*
MembroOuChamada → Valor ( "." IDENTIFICADOR | "(" Argumentos? ")" )*
Argumentos      → Expressao ( "," Expressao )*
Valor           → NUMERO | STRING | BOOLEAN | IDENTIFICADOR
                | "null" | "undefined"
                | "(" Expressao ")"
```

## 3. Precedência e associatividade

| Nível (menor → maior) | Operadores | Associatividade |
| --- | --- | --- |
| 1 | `=`, `+=`, `-=` | Direita |
| 2 | `\|\|` | Esquerda |
| 3 | `&&` | Esquerda |
| 4 | `==`, `!=` | Esquerda |
| 5 | `>`, `<`, `>=`, `<=` | Esquerda |
| 6 | `+`, `-` | Esquerda |
| 7 | `*`, `/`, `%` | Esquerda |
| 8 | `.` (acesso a membro), `()` (chamada) | Esquerda |

Parênteses sobrescrevem a precedência. Exemplos:

| Código | Interpretação |
| --- | --- |
| `a >= 0 && b != 3` | `(a >= 0) && (b != 3)` |
| `a \|\| b && c` | `a \|\| (b && c)` |
| `a && b && c` | `(a && b) && c` |
| `x = y = 1` | `x = (y = 1)` |

## 4. Nós da AST

Todo nó herda de `BaseNode` e carrega `linha` e `coluna` do token que o originou (rastreabilidade para as mensagens de erro).

### Comandos

| Nó (`tipo`) | Campos | Observações |
| --- | --- | --- |
| `DeclaracaoVariavel` | `modificador` (`let`/`const`/`var`), `nome`, `valorInicial: NoExpressao` | O valor inicial é obrigatório. |
| `DeclaracaoIf` | `condicao`, `consequencia: NoBloco`, `alternativa: NoBloco \| null` | `else` exige um bloco (não há `else if`). |
| `DeclaracaoWhile` | `condicao`, `corpo: NoBloco` | |
| `DeclaracaoFor` | `inicializacao: NoDeclaracaoVariavel \| NoExpressaoStatement \| null`, `condicao: NoExpressao \| null`, `atualizacao: NoExpressao \| null`, `corpo: NoBloco` | As três partes do cabeçalho podem ser omitidas (`for (;;)`). |
| `DeclaracaoFuncao` | `nome`, `parametros: NoParametro[]`, `corpo: NoBloco` | |
| `ReturnStatement` | `argumento: NoExpressao \| null` | `null` em `return;`. |
| `BreakStatement` | (somente `linha` e `coluna`) | |
| `ContinueStatement` | (somente `linha` e `coluna`) | |
| `Bloco` | `corpo: NoStatement[]` | |
| `ExpressaoStatement` | `expressao: NoExpressao` | |
| `Parametro` | `nome` | Usado em `DeclaracaoFuncao`. |

### Expressões

| Nó (`tipo`) | Campos | Observações |
| --- | --- | --- |
| `Literal` | `tipoDado` (`NUMERO`, `STRING`, `BOOLEAN`, `NULL`, `UNDEFINED`), `valor: string` | O valor é guardado como texto. |
| `Identificador` | `nome` | |
| `ExpressaoBinaria` | `operador`, `esquerda`, `direita` | Também representa atribuições (`=`, `+=`, `-=`). |
| `AcessoMembro` | `objeto: NoExpressao`, `propriedade: string` | Ex.: `console.log`. |
| `ChamadaFuncao` | `callee: NoExpressao`, `argumentos: NoExpressao[]` | Ex.: `soma(1, 2)`. |

Os campos opcionais `tipoInferido` (em `Literal`, `Identificador`, `ExpressaoBinaria`, `AcessoMembro`, `ChamadaFuncao` e `DeclaracaoVariavel`) **não são preenchidos pelo sintático**: são anotados depois pelo analisador semântico.

### Exemplo

Código:

```js
while (a >= 0 && b != 3) { a -= 1; }
```

AST (resumida):

```text
DeclaracaoWhile
├── condicao: ExpressaoBinaria (&&)
│   ├── esquerda: ExpressaoBinaria (>=)
│   │   ├── esquerda: Identificador (a)
│   │   └── direita:  Literal (0)
│   └── direita: ExpressaoBinaria (!=)
│       ├── esquerda: Identificador (b)
│       └── direita:  Literal (3)
└── corpo: Bloco
    └── ExpressaoStatement
        └── ExpressaoBinaria (-=)
            ├── esquerda: Identificador (a)
            └── direita:  Literal (1)
```

## 5. Tratamento de erros

- Um erro sintático lança um `ParseError` com a mensagem no formato `[Linha N:M] Erro de Sintaxe: <descrição>` e a registra em `client.errosSintaticos`.
- Mensagens típicas: `Esperado ')', mas encontrou '{'` e `Expressão inválida: token inesperado ';'`.
- **Panic Mode:** ao capturar o erro em `parseStatement()`, o método `sincronizar()` descarta tokens até passar por um `;` ou chegar a uma palavra-chave que inicia um novo comando. A análise então continua, e vários erros podem ser reportados em uma só execução.
- `run()` retorna `false` se houver pelo menos um erro, mas a AST parcial continua disponível em `client.ast`.

## 6. Fora do escopo atual

O analisador **não** reconhece, entre outros: operadores unários (`!x`, `-x`), `++` e `--`, `else if` (o `else` exige bloco), laços `do...while`, `for...of`/`for...in`, funções anônimas e arrow functions, arrays, objetos literais, template strings e operador ternário.

As regras de escopo e de tipos ficam no analisador semântico: veja [Semantico.md](Semantico.md).