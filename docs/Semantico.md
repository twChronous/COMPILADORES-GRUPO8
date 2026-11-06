# Analisador Semântico

Este documento descreve as regras aplicadas pelo analisador semântico
(`src/analyzers/Semantical.analyzer.ts`): a tabela de símbolos, os escopos, a
tipagem e os erros esperados.

O analisador recebe a AST produzida pelo analisador sintático, percorre todos os
comandos e **anota cada expressão com o campo `tipoInferido`**. Ao final, expõe a
tabela de símbolos em `client.tabelaSimbolos`.

> **Comportamento de erro:** o primeiro erro semântico interrompe a análise
> (a exceção é capturada em `run()` e registrada com `LOG_ERR`). Todas as
> mensagens têm o formato `Erro Semântico [Linha N]: <descrição>`.

## 1. Tabela de símbolos

Cada nome declarado vira um `Simbolo` (`src/utils/types.ts`):

| Campo | Descrição |
| --- | --- |
| `nome` | Identificador declarado |
| `modificador` | `let`, `const` ou `var` |
| `tipo` | Tipo semântico (ver seção 3) |
| `linhaDeclaracao` | Linha da declaração (`0` para nativos) |
| `escopo` | `Global`, `Global (Nativo)` ou `Bloco-N` |

O escopo global já nasce com os nomes nativos de JavaScript, todos tratados como
`const` (não podem ser reatribuídos):

| Nome | Tipo |
| --- | --- |
| `console`, `Math` | `object` |
| `Date`, `String`, `Number`, `Boolean`, `parseInt`, `parseFloat`, `isNaN` | `function` |

Além da pilha de escopos ativa, o analisador mantém um **registro permanente** de
todos os símbolos declarados, que é entregue em `tabelaSimbolos` mesmo quando
ocorre um erro.

## 2. Escopos

Os escopos formam uma pilha. O índice 0 é o escopo global.

| Constrói um novo escopo | Observação |
| --- | --- |
| Bloco `{ ... }` (`if`, `else`, `while`, bloco solto) | Variáveis declaradas dentro não existem fora |
| Função | Contém os parâmetros e o corpo |
| Laço `for` | Contém a variável de inicialização; o corpo `{ ... }` cria ainda outro escopo dentro dele |

Regras:

1. **Busca:** um nome é procurado do escopo mais interno para o global. Se não
   existir em nenhum, é erro.
2. **Redeclaração:** declarar um nome que já existe **no mesmo escopo** é erro.
3. **Sombreamento:** declarar um nome que existe apenas em um escopo **externo** é
   permitido; a declaração interna esconde a externa.
4. **`var`:** é tratado como `let` (escopo de bloco). Isto é uma simplificação em
   relação ao JavaScript real, onde `var` tem escopo de função.
5. **Funções:** o nome da função é registrado como `const` do tipo `function` no
   escopo onde ela é declarada, **antes** de o corpo ser verificado (permite
   recursão). Os parâmetros são registrados como `let` do tipo `any`.
6. **Laço `for`:** a variável declarada na inicialização existe somente dentro do
   `for` (condição, atualização e corpo). Não é visível depois do laço.

```js
let x = 1;
if (true) {
  let x = "a";   // OK: sombreia o x externo
}
for (let i = 0; i < 3; i += 1) { }
i = 1;           // ERRO: 'i' não existe fora do for
```

## 3. Tipos

Os tipos semânticos são: `number`, `string`, `boolean`, `null`, `undefined`,
`object`, `function`, `void` e `any`.

### Inferência

| Expressão | Tipo inferido |
| --- | --- |
| Literal numérico (`10`, `3.14`) | `number` |
| Literal de texto (`"oi"`) | `string` |
| `true` / `false` | `boolean` |
| `null` / `undefined` | `null` / `undefined` |
| Identificador | Tipo registrado na tabela de símbolos |
| Acesso a membro (`console.log`) | `any` (o objeto base precisa existir) |
| Chamada de função (`f(1, 2)`) | `any` (função e argumentos são validados) |
| Operação binária | Ver seção 4 |

O tipo de uma variável é **fixado pelo valor inicial** da declaração.

### O tipo `any`

`any` é o tipo dos parâmetros de função e dos resultados de acesso a membro e de
chamadas. Ele **desliga a checagem estrita**: qualquer operação binária em que um
dos lados é `any` resulta em `any`, e atribuições envolvendo `any` são aceitas.

## 4. Operadores

Para operações binárias com operandos `number`, `string` e `boolean`:

| Operador | Operandos aceitos | Resultado |
| --- | --- | --- |
| `+` | `number` + `number` | `number` |
| `+` | `string` + `string` | `string` |
| `-`, `*`, `/`, `%` | `number`, `number` | `number` |
| `>`, `<`, `>=`, `<=` | `number`, `number` | `boolean` |
| `==`, `!=` | dois operandos do **mesmo** tipo | `boolean` |
| `&&`, `\|\|` | `boolean`, `boolean` | `boolean` |

Qualquer outra combinação é erro (ex.: `"a" + 1`, `1 && 2`, `1 == "1"`).

### Atribuição

| Operador | Regra |
| --- | --- |
| `=` | O lado esquerdo deve ser um **identificador**. O tipo do valor deve ser igual ao tipo da variável (ou um dos lados ser `any`). |
| `+=`, `-=` | A variável e o valor devem ser `number` (ou um dos lados ser `any`). |

Em qualquer atribuição, o alvo **não pode ser `const`**.

## 5. Regras dos comandos

| Comando | Regra |
| --- | --- |
| `let` / `const` / `var` | Infere o tipo do valor inicial e registra o símbolo no escopo atual |
| `if` | A condição deve ser `boolean` (ou `any`); `then` e `else` abrem escopos próprios |
| `while` | A condição deve ser `boolean` (ou `any`); o corpo permite `break` e `continue` |
| `for` | Escopo próprio do laço; inicialização válida; condição (se existir) `boolean` ou `any`; atualização válida; corpo permite `break` e `continue` |
| `function` | Registra o nome, abre escopo, declara parâmetros como `any` e verifica o corpo |
| `return` | Só é permitido dentro de função; a expressão retornada é validada |
| `break` / `continue` | Só são permitidos dentro de `while` ou `for` |
| Chamada `f(a, b)` | A função e cada argumento precisam ser expressões válidas (não há checagem de número de argumentos) |

Um `break` ou `continue` dentro de uma **função declarada dentro de um laço** não
é válido: a função tem seu próprio contexto.

## 6. Exemplos de erros semânticos

| Código | Mensagem |
| --- | --- |
| `a;` | `A variável 'a' não foi declarada.` |
| `let x = 1; let x = 2;` | `A variável 'x' já foi declarada neste escopo.` |
| `const x = 1; x = 2;` | `Não é possível reatribuir valor à constante 'x' definida na linha 1.` |
| `let x = 1; x = "a";` | `Atribuição incompatível para 'x'. Esperado 'number', encontrado 'string'.` |
| `let s = "a"; s += 1;` | `O operador '+=' não suporta os tipos 'string' e 'number'.` |
| `let v = "a" + 1;` | `O operador '+' não aceita os operandos de tipos 'string' e 'number'.` |
| `1 = 2;` | `O lado esquerdo da atribuição deve ser um identificador.` |
| `if (1) { }` | `A condição do 'if' deve ser boolean, encontrado 'number'.` |
| `while (1) { }` | `A condição do 'while' deve ser boolean, encontrado 'number'.` |
| `for (let i = 0; 1; i += 1) { }` | `A condição do 'for' deve ser boolean, encontrado 'number'.` |
| `for (let i = 0; i < 3; i += 1) { } i = 1;` | `A variável 'i' não foi declarada.` (a variável não vaza do `for`) |
| `for (const i = 0; i < 3; i += 1) { }` | `Não é possível reatribuir valor à constante 'i' ...` |
| `break;` | `'break' só pode ser usado dentro de um laço de repetição (while ou for).` |
| `continue;` | `'continue' só pode ser usado dentro de um laço de repetição (while ou for).` |
| `return 1;` | `'return' só pode ser usado dentro do corpo de uma função.` |

## 7. Limitações conhecidas

- Não há checagem do **número ou dos tipos** dos argumentos de uma chamada.
- O **tipo de retorno** de funções não é inferido: toda chamada resulta em `any`.
- **Propriedades** de objetos nativos não são tipadas (`Math.PI` é `any`).
- O tipo de uma variável não muda depois da declaração (não há união de tipos).
- Apenas o **primeiro erro** é reportado por execução.

## 8. Testes

Os casos de teste ficam em `src/analyzers/Semantical.analyzer.spec.ts` e cobrem
escopos, `const`, tipos de operadores, condições, laços `for` e `while`, e
`break`/`continue`. Veja também [Estrutura de Testes](Testes.md).