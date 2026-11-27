# Especificação da Linguagem e Escopo

> **Projeto:** Compilador JavaScript → Go — Grupo 8
> **Referência desta revisão:** branch `main` (análise léxica/sintática/semântica concluídas nas milestones 7 e 8; geração Go em andamento).
> **Issue:** [#50 — Atualizar Escopo.md](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/50)
> **Limite do projeto:** o subconjunto descrito abaixo não representa compatibilidade completa com ECMAScript.

## 1. Objetivo e referências

O projeto da disciplina de Compiladores analisa e traduz para Go programas escritos em um subconjunto de JavaScript. A implementação atual cobre as fases léxica, sintática e semântica para o subconjunto listado neste documento e **já emite código Go** (`src/generators/go.generator.ts`) a partir da AST validada, com limitações descritas abaixo e em [Tradução JavaScript → Go](Traducao.md).

Especificações de referência:

- [ECMAScript — ECMA-262 (17ª edição, junho de 2026)](./ECMA-262_17th_edition_june_2026.pdf)
- [The Go Programming Language Specification](https://go.dev/ref/spec)

## 2. Etapas do compilador

| Etapa | Situação | Resultado atual |
| --- | --- | --- |
| Análise léxica | **Implementado** | Tokens com tipo, valor, linha e coluna |
| Análise sintática | **Implementado** (com limitações) | AST tipada e recuperação de erros (*Panic Mode*) |
| Análise semântica | **Implementado** (com limitações) | Validação, anotações `tipoInferido` e tabela de símbolos |
| Representação intermediária (IR) | **Fora do escopo** | Issues [#64](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/64)–[#66](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/66) canceladas; existe apenas *stub* em `ir.generator.ts`, não usado no pipeline de entrega |
| Otimização | **Fora do escopo** | Não prevista nesta disciplina |
| Geração de código Go | **Em progresso** | Tradução direta AST → Go via `GoGenerator`; integrada ao `Compiler.compile()`; refinamentos nas issues [#67](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/67)–[#73](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/73) |

**Importante:** compilar o *tooling* do projeto (`bun run build`, imagem Docker, etc.) não equivale a traduzir um programa-fonte `.js` para Go — a tradução ocorre ao executar o pipeline sobre o arquivo de entrada.

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
| Lógicos | `&&` e `\|\|` | **Implementado**, com precedência conforme a gramática do parser |
| Agrupamento | `(` e `)` | Implementado |

No código atual do analisador sintático, a prioridade, da maior para a menor, é:

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

**Limitações da geração Go (fase atual):**

- Tradução direta da AST, sem IR; tipos Go inferidos em `go.inference.ts` a partir de anotações semânticas simplificadas.
- Funções só no nível superior do programa; declarações `function` dentro de blocos geram erro na emissão.
- Builtins mapeados de forma fixa (ex.: `console.log` → `fmt.Println`); não cobre o ecossistema JavaScript completo.
- Nem todo programa válido para o analisador produz Go compilável sem ajustes manuais — casos cobertos pelos testes em `go.generator.spec.ts` e `Compiler.integration.spec.ts`.

Regras e exemplos detalhados: [Analisador Semântico](Semantico.md) e [Tradução JavaScript → Go](Traducao.md).

## 9. Testes

A suíte usa `bun:test`, com arquivos de testes próximos aos analisadores:

- `src/analyzers/Lexycal.analyzer.spec.ts`
- `src/analyzers/Syntactic.analyzer.spec.ts`
- `src/analyzers/Semantical.analyzer.spec.ts`
- `src/generators/go.generator.spec.ts`
- `src/Compiler.integration.spec.ts` (pipeline léxico → Go)

Os testes cobrem tokenização, AST, precedência, escopos, semântica, emissão Go e integração. Alguns cenários permanecem como `test.skip` nos analisadores e no gerador (ex.: execução comparativa com `go run` quando o Go não está no ambiente) e **não contam** como verificação ativa até serem habilitados.

Para executar:

```bash
bun install
bun test
bunx tsc --noEmit
```

Consulte [Estrutura de Testes](Testes.md) para o detalhamento dos casos.

## 10. Roadmap e rastreabilidade (milestones 7 e 8 e fase Go)

As tabelas abaixo descrevem o **comportamento esperado no código da `main`**. O estado de cada issue no GitHub (aberta/fechada) pode divergir enquanto o grupo conclui PRs — consulte o repositório para o status oficial.

### Milestone 7 — parsing

| Issue | Escopo | Status no compilador |
| --- | --- | --- |
| [#38](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/38) | Parser de `while` | **Implementado** |
| [#39](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/39) | Parser de `for` | **Implementado** |
| [#40](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/40) | Parser de `function` e `return` | **Implementado** |
| [#41](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/41) | Acesso a membro e chamadas | **Implementado** (subconjunto; ex.: `console.log`) |
| [#42](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/42) | Precedência e parênteses | **Implementado** |

### Milestone 8 — semântica e testes

| Issue | Escopo | Status no compilador |
| --- | --- | --- |
| [#43](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/43) | Semântica de `while` | **Implementado** |
| [#44](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/44) | Semântica de `for` | **Implementado** |
| [#45](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/45) | Semântica de funções e `return` | **Implementado** (com limitações da seção 8) |
| [#46](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/46) | Chamadas e `console.log` | **Implementado** (validação básica; sem assinaturas completas de builtins) |
| [#47](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/47) | Ampliar testes sintático/semântico | **Implementado** (permanecem casos `test.skip`) |

### Fase atual — geração Go e entrega

| Issue | Escopo | Status no compilador |
| --- | --- | --- |
| [#67](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/67) | Expressões, literais e `let`/`const`/`var` em Go | **Em progresso** (base em `go.generator.ts`; revisão e casos de borda) |
| [#68](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/68) | Controle de fluxo em Go | **Implementado** (`if`/`else`, `while`, `for`, `break`/`continue`) |
| [#69](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/69) | Funções, `return` e `console.log` → `fmt` | **Implementado** (funções aninhadas não suportadas) |
| [#70](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/70) | Integrar gerador no `Compiler` e loaders | **Em progresso** (`compile()` já invoca o gerador Go; alinhamento de loaders e erros) |
| [#71](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/71) | CLI e exemplos ponta a ponta | **Em progresso** (`--go`, `-o`/`--out` existem; falta padronizar `--output` e pasta `examples/`) |
| [#73](https://github.com/twChronous/COMPILADORES-GRUPO8/issues/73) | Testes de integração do pipeline | **Em progresso** (`Compiler.integration.spec.ts` parcial; expansão prevista) |

Documentação relacionada: [Arquitetura](Arquitetura.md), [Analisador Semântico](Semantico.md), [Tradução JavaScript → Go](Traducao.md) e [Estrutura de Testes](Testes.md).

## 11. Entrada, execução e saída

A aplicação (`src/index.ts`) recebe um arquivo `.js` na linha de comando ou, sem arquivo, usa um exemplo interno. Flags opcionais expõem artefatos intermediários; após análise bem-sucedida, o código Go é gerado e pode ser impresso ou gravado em disco.

```bash
bun start --help
bun start arquivo.js
bun start arquivo.js --go
bun start arquivo.js -o saida.go    # equivalente a --out
bun start arquivo.js --ast
bun start arquivo.js --tokens
bun start arquivo.js --ts
bun start arquivo.js --verbose
```

Comportamento resumido:

- Sem flags de depuração (`--ast`, `--tokens`, `--ts`), a saída padrão após compilação bem-sucedida é o **código Go** gerado.
- `-o` / `--out <arquivo>` grava o `.go` e ainda imprime o código, salvo se só outras flags de inspeção forem usadas.
- Falha em qualquer fase (léxica, sintática, semântica ou geração) encerra com código de saída `1`.

Detalhes da emissão Go: [Traducao.md](Traducao.md).
