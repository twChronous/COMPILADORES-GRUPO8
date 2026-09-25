# Estrutura de Testes

Este documento descreve a estrutura de testes unitários adotada no projeto do
compilador JavaScript para Go. O objetivo é manter uma convenção simples e
uniforme, de modo que cada componente possa ser verificado de forma isolada.

## Ferramenta

Os testes utilizam o runner nativo do Bun, disponível pelo módulo `bun:test`.
A suite é executada com o comando `bun test`, definido no `package.json` do
repositório.

## Organização dos arquivos

Os arquivos de teste ficam **ao lado do código-fonte** que exercitam. O nome
segue o módulo correspondente, com o sufixo `.spec.ts`:

```text
src/analyzers/Lexycal.analyzer.ts
src/analyzers/Lexycal.analyzer.spec.ts
```

Não há pasta separada de testes. Essa colocação deixa explícita a relação entre
implementação e especificação.

## Escopo de cada teste

Cada analisador deve testar a **lógica pura** do seu módulo — por exemplo, o
método `tokenize` do analisador léxico — e não o pipeline completo de
compilação. Os casos cobrem entradas válidas e erros esperados.

Conforme novos analisadores forem implementados, uma seção correspondente será
adicionada a este documento.

## Analisador léxico

Arquivo de testes: `src/analyzers/Lexycal.analyzer.spec.ts`.

<details>
<summary>Casos de teste implementados</summary>

| Caso | Descrição |
| --- | --- |
| `a = 1 + 2` | Produz a lista completa de tokens |
| Caractere inválido (`@`) | Lança `TypeError` com mensagem de posição |
| Palavras-chave | Reconhece `let`, `const`, `var`, `function`, `if`, `else`, `while`, `for`, `return` com o subtipo correto |
| Identificadores | Reconhece identificadores, incluindo underline e dígitos |
| Números | Reconhece inteiros e decimais |
| Strings | Reconhece aspas duplas, aspas simples e string vazia |
| Booleanos | Reconhece `true` e `false` |
| Operadores | Reconhece aritméticos, de atribuição, relacionais e lógicos |
| `===` | Normaliza o operador `===` para `==` |
| Delimitadores | Reconhece `{ } ( ) ; , .` |
| Espaços em branco | Ignora espaços, tabulações e quebras de linha |
| Entrada vazia | Entrada vazia ou só com espaços gera apenas o token `EOF` |
| Programa completo | `let x = 10; if (x > 5) { return true; }` produz a sequência correta |
| Erro no meio da entrada | Caractere inválido reporta a posição correta |

</details>
