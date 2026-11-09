# Especificação da Linguagem e Escopo

> **Projeto:** Compilador JavaScript → Go — Grupo 8
> **Referência desta revisão:** código da `main` e funcionalidades contempladas nas PRs #58 (precedência de operadores) e #59 (ampliação de testes).
> **Observação de integração:** esta edição considera o conteúdo dessas PRs no **estado funcional consolidado**, conforme planejamento do grupo; o merge efetivo deve ser verificado no GitHub.
> **Limite do projeto:** o subconjunto descrito abaixo não representa compatibilidade completa com ECMAScript.

## 1. Objetivo e referências

O projeto da disciplina de Compiladores tem como objetivo analisar e, posteriormente, traduzir para Go programas escritos em um subconjunto de JavaScript. A implementação atual realiza as fases léxica, sintática e semântica, mas **ainda não gera arquivos Go a partir do código JavaScript**.

Especificações de referência:

- [ECMAScript — ECMA-262 (17ª edição, junho de 2026)](./ECMA-262_17th_edition_june_2026.pdf)
- [The Go Programming Language Specification](https://go.dev/ref/spec)

## 2. Etapas do compilador

| Etapa | Situação | Resultado atual |
| --- | --- | --- |
| Análise léxica | Implementada para o subconjunto | Tokens com tipo, valor, linha e coluna |
| Análise sintática | Implementada para as construções listadas, com limitações | AST tipada e recuperação de erros (*Panic Mode*) |
| Análise semântica | Implementada para as regras listadas, com limitações | Validação, anotações `tipoInferido` e tabela de símbolos |
| Representação intermediária (IR) | Planejada | Ainda não implementada |
| Otimização | Planejada | Ainda não implementada |
| Geração de código Go | Planejada | Ainda não implementada |

**Importante:** a geração de um executável ou pacote da ferramenta de compilação pelo processo de build não equivale à tradução do programa-fonte para código Go.

## 3. Tipos de dados e literais

| Construção | Reconhecimento | Observações |
| --- | --- | --- |
| Números (`10`, `3.14`) | Léxico, sintático e semântico | O léxico aceita dígitos e pontos, mas não valida todos os formatos numéricos ECMAScript |
| Strings (`"texto"`, `'texto'`) | Léxico, sintático e semântico | Aspas simples ou duplas; escapes não são tratados de forma completa |
| Booleanos (`true`, `false`) | Léxico, sintático e semântico | Tokens `BOOLEAN` |
| `null` | Léxico, sintático e semântico | Palavra-chave transformada em literal do tipo `null` |
| `undefined` | Léxico, sintático e semântico | Palavra-chave transformada em literal do tipo `undefined` |

Os tipos semânticos utilizados são: `number`, `string`, `boolean`, `null`, `undefined`, `any`, `void`, `object` e `function`. O tipo `any` é usado em situações nas quais a análise não determina um tipo estático preciso, como parâmetros de funções e resultados de chamadas.

## 4. Palavras-chave e comandos

| Construção | Léxico | Sintático | Semântico |
| --- | --- | --- | --- |
| `let`, `const`, `var` | Implementado | Implementado | Implementado, com regras simplificadas de escopo |
| `if` / `else` | Implementado | Implementado | Implementado |
| `while` | Implementado | Implementado | Implementado |
| `for` clássico | Implementado | Implementado | Implementado |
| `function` | Implementado | Implementado | Implementado, com limitações de tipagem |
| `return` | Implementado | Implementado | Implementado, com tipo inferido no nó de retorno |
| `break` / `continue` | Implementado | Implementado | Implementado dentro de laços |
| `true`, `false` | Implementado | Implementado | Implementado |
| `null`, `undefined` | Implementado | Implementado | Implementado |

**Restrições das construções:**

- Declarações `let`, `const` e `var` são reconhecidas na forma com inicialização, como `let x = 1;`. O `var` é tratado com escopo de bloco na análise semântica, diferentemente do JavaScript completo.
- `if` e `while` exigem a condição entre parênteses e o corpo delimitado por chaves; `else` é opcional e usa um bloco.
- `for` contempla a forma clássica `for (inicialização; condição; atualização) { ... }`. As três partes podem ser omitidas quando permitido pela gramática do parser, por exemplo `for (;;) { ... }`.
- `function nome(parametros) { ... }` admite lista vazia ou múltiplos parâmetros; `return` pode ter expressão ou ser vazio.
- `break` e `continue` só são aceitos semanticamente em um contexto de laço. Funções declaradas dentro de laços não herdam esse contexto.
- O ponto e vírgula é opcional em algumas instruções do subconjunto, mas obrigatório nos separadores do cabeçalho de `for`.

## 5. Identificadores e delimitadores

Identificadores reconhecidos pelo léxico começam com letra ASCII (`A-Z`, `a-z`) ou `_`, seguidos de letras ASCII, números ou `_`. Não há suporte completo às regras de identificadores Unicode do ECMAScript.

O léxico reconhece os delimitadores `{`, `}`, `(`, `)`, `,`, `;` e `.`. O ponto permite acesso a membros, por exemplo `console.log`. O parser produz os nós `AcessoMembro` e `ChamadaFuncao` para expressões como `console.log("Olá")` e `soma(1, 2)`.

Espaços, tabs e quebras de linha são descartados pelo léxico; ao final da entrada, ele gera o token `EOF`.

## 6. Operadores e precedência

Operadores reconhecidos e tratados pelo subconjunto:

| Categoria | Operadores | Situação |
| --- | --- | --- |
| Aritméticos | `+`, `-`, `*`, `/`, `%` | Implementado para os casos binários previstos |
| Atribuição | `=`, `+=`, `-=` | Implementado |
| Relacionais | `>`, `<`, `>=`, `<=` | Implementado |
| Igualdade | `==`, `!=` | Implementado |
| Lógicos | `&&` e `\|\|` | Implementado no estado consolidado, incluindo a precedência da PR #58 |
| Agrupamento | `(` e `)` | Implementado |

No estado consolidado que contempla a PR #58, a prioridade, da maior para a menor, é:

1. Acesso a membros, chamadas e agrupamento por parênteses.
2. Multiplicação, divisão e módulo (`*`, `/`, `%`).
3. Adição e subtração (`+`, `-`).
4. Comparações relacionais (`>`, `<`, `>=`, `<=`).
5. Igualdade (`==`, `!=`).
6. E lógico (`&&`).
7. OU lógico (`||`).
8. Atribuições (`=`, `+=`, `-=`), associadas à direita.

As operações binárias de mesmo nível são, em geral, associadas à esquerda. Não se trata de uma implementação completa de todos os operadores ou das regras de precedência do JavaScript.

**Limitação relevante:** o léxico converte `===` em `==`. Isso não preserva integralmente a distinção entre igualdade estrita e igualdade abstrata do JavaScript.

## 7. Estruturas da AST

Os nós principais definidos em `src/utils/types.ts` incluem:

| Categoria | Nós |
| --- | --- |
| Expressões | `Literal`, `Identificador`, `ExpressaoBinaria`, `AcessoMembro`, `ChamadaFuncao` |
| Declarações e comandos | `DeclaracaoVariavel`, `DeclaracaoIf`, `DeclaracaoWhile`, `DeclaracaoFor`, `DeclaracaoFuncao`, `ReturnStatement` |
| Outros comandos | `Bloco`, `ExpressaoStatement`, `BreakStatement`, `ContinueStatement` |
| Elementos de função | `Parametro` |

Os nós carregam `linha` e `coluna`. Expressões e nós de retorno podem receber a anotação `tipoInferido` na análise semântica. O parser possui recuperação de erros sintáticos pelo mecanismo *Panic Mode*.

## 8. Regras semânticas e limitações

A análise semântica utiliza uma pilha de escopos e uma tabela de símbolos. As principais regras são:

- Verificação de uso de nomes não declarados e de redeclarações no mesmo escopo, com sombreamento permitido entre escopos diferentes.
- Inferência básica de tipos em literais, expressões, declarações e operações; validação de atribuições e proteção contra reatribuição de `const`.
- Condições de `if`, `while` e `for` devem ter tipo `boolean` ou `any`.
- `while` abre escopo para seu corpo; `for` mantém escopo próprio para inicialização, condição e atualização, além do escopo do corpo.
- Funções são registradas na tabela de símbolos com tipo `function`; parâmetros são declarados no escopo da função como `any`.
- `return` fora de função é erro; `return` com expressão registra seu tipo no próprio nó e `return;` recebe `void`.
- `break` e `continue` são permitidos somente em laços `while` ou `for`.
- Chamadas validam a existência do identificador base e analisam os argumentos; objetos nativos como `console` estão pré-registrados.

**Limitações conhecidas:**

- Não há verificação completa de aridade, tipos de parâmetros ou se todo *callee* é efetivamente invocável.
- A análise do tipo do `return` não determina o tipo global de retorno da função, nem garante consistência entre diferentes caminhos de retorno.
- Resultados de chamadas e acessos a membros recebem `any`; propriedades nativas, como `Math.PI` e `console.log`, não são tipadas individualmente.
- O primeiro erro semântico normalmente interrompe a análise; o comportamento difere da recuperação de erros sintáticos.
- Algumas regras são simplificações em relação ao JavaScript, particularmente escopo de `var`, conversões implícitas e operadores de igualdade.

Regras e exemplos detalhados: [Analisador Semântico](Semantico.md).

## 9. Testes

A suíte usa `bun:test`, com arquivos de testes próximos aos analisadores:

- `src/analyzers/Lexycal.analyzer.spec.ts`
- `src/analyzers/Syntactic.analyzer.spec.ts`
- `src/analyzers/Semantical.analyzer.spec.ts`

Os testes cobrem tokenização, construção de AST, precedência, agrupamentos, funções, condições, escopos, validação de tipos e comportamentos válidos e inválidos. A ampliação da PR #59 é considerada nesta descrição; alguns cenários ainda estão marcados como `test.skip` e **não são executados** até sua ativação. Portanto, a existência desses casos não equivale a uma verificação automatizada ativa.

Para executar:

```bash
bun install
bun test
bunx tsc --noEmit
```

Consulte [Estrutura de Testes](Testes.md) para o detalhamento dos casos.

## 10. Roadmap e rastreabilidade das milestones 7 e 8

Esta tabela apresenta **o estado funcional consolidado**, considerando o código integrado e o conteúdo das PRs #58 e #59. O estado administrativo de cada issue/PR deve ser consultado no GitHub.

| Issue | Milestone | Escopo | Estado funcional considerado |
| --- | --- | --- | --- |
| [#38](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/38) | 7 | Parser de `while` | Implementado |
| [#39](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/39) | 7 | Parser de `for` | Implementado (PR #57) |
| [#40](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/40) | 7 | Parser de função e `return` | Implementado (PR #55) |
| [#41](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/41) | 7 | Acesso a membro e chamadas | Implementado para o subconjunto |
| [#42](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/42) | 7 | Precedência de operadores | Implementado no estado consolidado da PR #58 |
| [#43](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/43) | 8 | Semântica de `while` | Implementado (PR #57) |
| [#44](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/44) | 8 | Semântica de `for` | Implementado (PR #57) |
| [#45](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/45) | 8 | Semântica de funções/`return` | Implementado com as limitações descritas (PR #56) |
| [#46](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/46) | 8 | Semântica de chamadas e `console.log` | Parcial: identificação básica e validação de argumentos, sem assinatura completa |
| [#47](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/47) | 8 | Ampliar testes sintáticos e semânticos | Cobertura ampliada no estado consolidado da PR #59; ainda há `test.skip` |

Outras documentações relacionadas: [Arquitetura](Arquitetura.md), [Analisador Semântico](Semantico.md) e [Estrutura de Testes](Testes.md).

## 11. Entrada, execução e saída

A aplicação recebe um arquivo JavaScript por linha de comando ou, na ausência de arquivo, executa uma entrada de exemplo interna. Há opções para exibir tokens, AST e tabela de símbolos.

```bash
bun start --help
bun start --ast
bun start --tokens
bun start --ts
```

O processamento atual produz tokens, AST, anotações semânticas, tabela de símbolos e diagnósticos. **A tradução para Go permanece uma etapa futura.**
