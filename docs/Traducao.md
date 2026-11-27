# Tradução JavaScript → Go

Este documento descreve as regras de emissão de código Go implementadas no
pipeline do compilador a partir da AST anotada e da inferência em `go.inference.ts`.

## Estrutura do arquivo gerado

- **Pacote:** sempre `package main`.
- **Imports:** coletados automaticamente durante a geração (ex.: `import "fmt"` ao
  usar `console.log`) e ordenados alfabeticamente; quando há mais de um pacote,
  usa `import ( ... )`.
- **Funções:** declarações `DeclaracaoFuncao` no nível superior são emitidas como
  `func nome(params...) [tipoRetorno] { ... }`.
- **Ponto de entrada:** os demais comandos do nível superior são emitidos dentro
  de `func main() { ... }`.

## Tipos e literais

### Mapeamento de tipos

| Tipo semântico (JS) / contexto | Tipo Go emitido | Observações |
|-------------------------------|-----------------|-------------|
| `number` | `float64` | Aproxima números JS por ponto flutuante de 64 bits |
| `string` | `string` | Strings em Go |
| `boolean` | `bool` | Booleanos em Go |
| `any`, `null`, `undefined`, `void`, `object`, `function` | `any` | Fallback de `mapearTipo()` quando não há tipo primitivo direto |

### Literais

| Construção JS | Emissão em Go | Observações |
|---------------|---------------|-------------|
| Número (`10`, `3.14`) | `10`, `3.14` | Mantém a lexeme |
| String (`"abc"`, `'abc'`) | `"abc"` | Aspas duplas com escape de `\`, `"`, `\n`, `\r` e `\t` |
| Booleano (`true`, `false`) | `true`, `false` | Literal booleano |
| `null` | `nil` | Em declaração, tipo estático cai em `any` quando não há tipo concreto |
| `undefined` | `nil` | Emitido como `nil` na expressão literal; em retornos sem valor/fim de função com retorno usa o valor zero do tipo (`0`, `""`, `false`, `nil`) |

## Operadores e precedência

- **Operadores binários com mesma grafia:** `+`, `-`, `*`, `/`, `%`, `==`, `!=`,
  `>`, `<`, `>=`, `<=`, `&&`, `||`.
- **Operadores de atribuição:** `=`, `+=`, `-=`.
- **Precedência e parênteses:** a AST já reflete a árvore de precedência; o
  gerador adiciona parênteses quando a precedência do filho é menor que a do
  pai, ou quando há operador não associativo à direita (`-`, `/`, `%`) com igual
  precedência à direita.

## Comandos, laços, funções e chamadas

| Construção JS (AST) | Tradução Go | Status / observações |
|---------------------|-------------|------------------------|
| `let x = expr` / `var x = expr` | `var x <tipoGo> = <expr>` | Usa tipo deduzido (`float64`, `string`, `bool` ou `any`) |
| `const x = expr` | `const x = <expr>` (se `tipoGo !== "any"`) ou `var x any = <expr>` | Constantes Go exigem tipo compatível com `const` |
| `if (c) { ... } else { ... }` | `if <c> { ... } else { ... }` | `else` opcional |
| `while (c) { ... }` | `for <c> { ... }` | Traduzido para `for` condicional em Go |
| `for (init; cond; upd) { ... }` | `for <init>; <cond>; <upd> { ... }` | Suporta `for <cond> { ... }`, `for { ... }` e inicialização com `:=` |
| `break` / `continue` | `break` / `continue` | Mantidos diretamente |
| `function f(a, b) { ... }` | `func f(a <t1>, b <t2>) <ret> { ... }` | Tipos de parâmetros/retorno inferidos quando possível; completa retorno com valor zero se faltar caminho terminal |
| `return expr` / `return;` | `return <expr>` / `return` (ou `return <zero>`) | Se `return;` vazio ocorrer em função com tipo de retorno, emite valor zero |
| `console.log(...)` | `fmt.Println(...)` | Adiciona `"fmt"` aos imports |
| Outros `AcessoMembro` / `ChamadaFuncao` | `<obj>.<prop>(<args...>)` | Demais métodos/objetos nativos não têm tradução especial mapeada |
| Função aninhada (`DeclaracaoFuncao` interna) | **Não traduzida** | Lança `Erro de Geração` |
| Outros comandos fora de `NoStatement` suportado | **Não traduzida** | Lança `Erro de Geração` |