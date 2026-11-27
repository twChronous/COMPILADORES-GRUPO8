# Tradução JavaScript → Go

Este documento registra decisões do gerador de código Go para o subconjunto
suportado. A issue **#67** cobre expressões, literais e declarações de
variáveis; controle de fluxo (#68) e funções (#69) estendem o mesmo pipeline.

## Tipos estáticos

Os tipos vêm de `tipoInferido` na AST (após o analisador semântico) e da
`tabelaSimbolos` quando necessário.

| Tipo semântico (JS) | Tipo Go emitido |
|--------------------|-----------------|
| `number`           | `float64`       |
| `string`           | `string`        |
| `boolean`          | `bool`          |
| `null`             | `interface{}` (valor `nil`) |
| `undefined`        | valor zero do tipo de contexto |
| `any`, `object`    | `interface{}`   |

Números JavaScript são mapeados para `float64` para aproximar o comportamento
dinâmico de `number` em JS.

## Declarações

| JS            | Go emitido                          |
|---------------|-------------------------------------|
| `let x = e`   | `var x <tipo> = <e>`                |
| `var x = e`   | `var x <tipo> = <e>`                |
| `const x = e` | `const x <tipo> = <e>`              |

O tipo `<tipo>` é derivado da inferência semântica do inicializador.

## Literais

- **Número:** mantém a lexeme (`10`, `3.14`).
- **String:** aspas duplas com escapes (`\n`, `\"`, etc.).
- **Boolean:** `true` / `false`.
- **`null`:** literal `nil`. Em declarações com tipo inferido `null`, o tipo
  estático emitido é `interface{}`.
- **`undefined`:** não existe em Go; em expressão usa-se o **valor zero** do
  tipo de contexto (ex.: `0` para `number`, `""` para `string`, `nil` para
  `interface{}`).

## Operadores

Aritméticos, relacionais, igualdade (`==`, `!=`) e lógicos (`&&`, `||`) usam a
mesma grafia em Go. Atribuições `=`, `+=` e `-=` são emitidas como em Go.

A AST já reflete a precedência; o gerador adiciona parênteses apenas quando um
operador filho teria precedência menor que o pai.

## Formato de saída (coordenação #68–#70)

- Fragmentos da issue **#67** são linhas válidas dentro de um corpo de função
  Go (sem `package` / `func` ainda).
- Issues posteriores devem reutilizar `gerarExpressao`, `gerarStatement` e
  `gerarStatements` de `GoCodegen.analyzer.ts` para manter um único estilo de
  emissão.

## Integração

O analisador `GoCodegen` preenche `client.codigoGo` quando `run()` é chamado
após a análise semântica. A orquestração na classe `Compiler` fica na issue
**#70**.