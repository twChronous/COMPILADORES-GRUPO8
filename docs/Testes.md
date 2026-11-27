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

src/analyzers/Syntactic.analyzer.ts
src/analyzers/Syntactic.analyzer.spec.ts

src/analyzers/Semantical.analyzer.ts
src/analyzers/Semantical.analyzer.spec.ts

src/analyzers/GoCodegen.analyzer.ts
src/analyzers/GoCodegen.analyzer.spec.ts

src/generators/go.generator.ts
src/generators/go.generator.spec.ts

src/Compiler.ts
src/Compiler.integration.spec.ts
```

Não há pasta separada de testes. Essa colocação deixa explícita a relação entre
implementação e especificação.

## Escopo de cada teste

Cada analisador deve testar a **lógica pura** do seu módulo — por exemplo, o
método `tokenize` do léxico, a construção da AST no sintático ou a checagem de
escopo/tipos no semântico. Os casos cobrem entradas válidas e erros esperados.

Quando uma construção ainda não está disponível na `main`, o caso correspondente
pode ficar em `test.skip` até a feature chegar. O pipeline completo (`Compiler.compile`)
é testado à parte, em `Compiler.integration.spec.ts`.

## Analisador léxico

Arquivo de testes: `src/analyzers/Lexycal.analyzer.spec.ts`.

<details>
<summary>
  <kbd>▶</kbd>
  <strong>Casos de teste implementados</strong>
  <em>(clique para expandir)</em>
</summary>

<table>
<thead>
<tr>
<th>Caso</th>
<th>Descrição</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>a = 1 + 2</code></td>
<td>Produz a lista completa de tokens</td>
</tr>
<tr>
<td>Caractere inválido (<code>@</code>)</td>
<td>Lança <code>TypeError</code> com mensagem de posição</td>
</tr>
<tr>
<td>Palavras-chave</td>
<td>Reconhece <code>let</code>, <code>const</code>, <code>var</code>, <code>function</code>, <code>if</code>, <code>else</code>, <code>while</code>, <code>for</code>, <code>return</code> com o subtipo correto</td>
</tr>
<tr>
<td>Identificadores</td>
<td>Reconhece identificadores, incluindo underline e dígitos</td>
</tr>
<tr>
<td>Números</td>
<td>Reconhece inteiros e decimais</td>
</tr>
<tr>
<td>Strings</td>
<td>Reconhece aspas duplas, aspas simples e string vazia</td>
</tr>
<tr>
<td>Booleanos</td>
<td>Reconhece <code>true</code> e <code>false</code></td>
</tr>
<tr>
<td>Operadores</td>
<td>Reconhece aritméticos, de atribuição, relacionais e lógicos</td>
</tr>
<tr>
<td><code>===</code></td>
<td>Normaliza o operador <code>===</code> para <code>==</code></td>
</tr>
<tr>
<td>Delimitadores</td>
<td>Reconhece <code>{ } ( ) ; , .</code></td>
</tr>
<tr>
<td>Espaços em branco</td>
<td>Ignora espaços, tabulações e quebras de linha</td>
</tr>
<tr>
<td>Entrada vazia</td>
<td>Entrada vazia ou só com espaços gera apenas o token <code>EOF</code></td>
</tr>
<tr>
<td>Programa completo</td>
<td><code>let x = 10; if (x &gt; 5) { return true; }</code> produz a sequência correta</td>
</tr>
<tr>
<td>Erro no meio da entrada</td>
<td>Caractere inválido reporta a posição correta</td>
</tr>
</tbody>
</table>

</details>

## Analisador sintático

Arquivo de testes: `src/analyzers/Syntactic.analyzer.spec.ts`.

Os testes passam o código pelo léxico e em seguida pelo sintático, validando a
AST gerada e as mensagens em `errosSintaticos`. Há um bloco dedicado a
precedência de operadores e outro a erros de sintaxe no cabeçalho do `for`.

<details>
<summary>
  <kbd>▶</kbd>
  <strong>Casos de teste implementados</strong>
  <em>(clique para expandir)</em>
</summary>

<table>
<thead>
<tr>
<th>Caso</th>
<th>Descrição</th>
</tr>
</thead>
<tbody>
<tr>
<td>Declarações <code>let</code>/<code>const</code>/<code>var</code></td>
<td>Gera AST com modificador, nome e valor inicial</td>
</tr>
<tr>
<td>Declaração com string e boolean</td>
<td>Literais <code>STRING</code> e <code>BOOLEAN</code> no valor inicial</td>
</tr>
<tr>
<td>Sem ponto e vírgula</td>
<td>Aceita declarações consecutivas com <code>;</code> opcional</td>
</tr>
<tr>
<td>Precedência matemática</td>
<td><code>2 + 3 * 4</code> agrupa a multiplicação antes da adição</td>
</tr>
<tr>
<td>Parênteses em expressão</td>
<td><code>(2 + 3) * 4</code> força o agrupamento da soma</td>
</tr>
<tr>
<td>Fatores <code>/</code> e <code>%</code></td>
<td>Divisão e módulo na mesma faixa de precedência, associativos à esquerda</td>
</tr>
<tr>
<td><code>&&</code> e relacional</td>
<td><code>a &gt;= 0 &amp;&amp; b != 3</code> coloca <code>&&</code> na raiz da expressão</td>
</tr>
<tr>
<td><code>&amp;&amp;</code> vs <code>||</code></td>
<td><code>a || b &amp;&amp; c</code> e <code>a &amp;&amp; b || c</code> respeitam a ligação mais forte do <code>&amp;&amp;</code></td>
</tr>
<tr>
<td>Relacional vs igualdade</td>
<td><code>a == b &lt; c</code> agrupa o relacional antes da igualdade</td>
</tr>
<tr>
<td>Aritmética vs relacional</td>
<td><code>a + 1 &gt; b</code> avalia a soma antes da comparação</td>
</tr>
<tr>
<td>Associatividade de <code>&amp;&amp;</code></td>
<td><code>a &amp;&amp; b &amp;&amp; c</code> encadeia à esquerda</td>
</tr>
<tr>
<td>Parênteses em lógica</td>
<td><code>(a || b) &amp;&amp; c</code> e expressões com <code>&gt;=</code>/<code>!=</code> explícitos</td>
</tr>
<tr>
<td><code>if</code>/<code>else</code></td>
<td>Condição, bloco consequente e alternativa</td>
</tr>
<tr>
<td><code>if</code> sem <code>else</code></td>
<td>Alternativa fica <code>null</code></td>
</tr>
<tr>
<td><code>if</code> sem parênteses</td>
<td>Erro de sintaxe na condição</td>
</tr>
<tr>
<td><code>while</code></td>
<td>Gera <code>DeclaracaoWhile</code> com condição e corpo</td>
</tr>
<tr>
<td><code>while</code> com <code>&amp;&amp;</code></td>
<td>Condição com <code>&amp;&amp;</code> e <code>!=</code> na AST</td>
</tr>
<tr>
<td><code>break</code>/<code>continue</code> no <code>while</code></td>
<td>Reconhece os statements dentro do bloco</td>
</tr>
<tr>
<td><code>while</code> sem bloco</td>
<td>Erro de sintaxe</td>
</tr>
<tr>
<td><code>for</code> clássico</td>
<td><code>DeclaracaoFor</code> com inicialização, condição, atualização e corpo</td>
</tr>
<tr>
<td><code>for</code> com atribuição na inicialização</td>
<td>Inicialização como <code>ExpressaoStatement</code> (<code>i = 0</code>)</td>
</tr>
<tr>
<td><code>for (;;)</code></td>
<td>Três partes do cabeçalho podem ser omitidas</td>
</tr>
<tr>
<td>Erros no <code>for</code></td>
<td>Falta de <code>;</code>, <code>)</code> ou <code>{</code> registra erro em <code>errosSintaticos</code></td>
</tr>
<tr>
<td>Função sem parâmetros</td>
<td>Gera <code>DeclaracaoFuncao</code> com lista vazia e bloco</td>
</tr>
<tr>
<td>Função com parâmetros e <code>return</code></td>
<td>Parâmetros e expressão de retorno na AST</td>
</tr>
<tr>
<td><code>return</code> sem expressão</td>
<td>Argumento do retorno é <code>null</code></td>
</tr>
<tr>
<td><code>return</code> dentro de <code>if</code></td>
<td>Return em ramo condicional e após o <code>if</code></td>
</tr>
<tr>
<td>Parâmetro inválido</td>
<td><code>function soma(123)</code> gera erro de sintaxe</td>
</tr>
<tr>
<td>Chamada de função</td>
<td><code>soma(1, 2)</code> vira <code>ChamadaFuncao</code></td>
</tr>
<tr>
<td>Membro e chamada</td>
<td><code>console.log("oi")</code> combina <code>AcessoMembro</code> e <code>ChamadaFuncao</code></td>
</tr>
<tr>
<td>Parêntese não fechado</td>
<td>Erro de sintaxe em expressão incompleta</td>
</tr>
<tr>
<td>Panic Mode</td>
<td>Recupera após erro e continua a análise das próximas instruções</td>
</tr>
<tr>
<td><code>for</code> clássico (legado)</td>
<td><em>test.skip</em> — caso duplicado mantido até remoção do skip no spec</td>
</tr>
</tbody>
</table>

</details>

## Analisador semântico

Arquivo de testes: `src/analyzers/Semantical.analyzer.spec.ts`.

Os testes montam nós AST (função helper `analisar`) ou reutilizam o pipeline
léxico → sintático → semântico. Verificam inferência de tipos (`tipoInferido`),
regras de escopo, `tabelaSimbolos` e mensagens de erro. O bloco
`SemanticalAnalyzer - laços (for e while)` concentra os casos de laços.

<details>
<summary>
  <kbd>▶</kbd>
  <strong>Casos de teste implementados (núcleo)</strong>
  <em>(clique para expandir)</em>
</summary>

<table>
<thead>
<tr>
<th>Caso</th>
<th>Descrição</th>
</tr>
</thead>
<tbody>
<tr>
<td>Declaração <code>let</code> com número</td>
<td>Anota <code>tipoInferido: "number"</code></td>
</tr>
<tr>
<td>Variável não declarada</td>
<td>Erro semântico ao usar identificador inexistente</td>
</tr>
<tr>
<td>Redeclaração no mesmo escopo</td>
<td>Erro ao declarar o mesmo nome duas vezes</td>
</tr>
<tr>
<td>Escopo do <code>if</code></td>
<td>Variável externa é visível; variável do bloco não vaza</td>
</tr>
<tr>
<td>Sombreamento</td>
<td>Redeclaração em escopo interno é permitida</td>
</tr>
<tr>
<td>Reatribuição de <code>const</code></td>
<td>Erro ao atribuir de novo a constante</td>
</tr>
<tr>
<td>Reatribuição de <code>let</code></td>
<td>Aceita o mesmo tipo; rejeita tipo incompatível</td>
</tr>
<tr>
<td>Condição do <code>if</code></td>
<td>Deve ser <code>boolean</code></td>
</tr>
<tr>
<td>Operadores aritméticos</td>
<td>Soma de números é <code>number</code>; string + número é erro</td>
</tr>
<tr>
<td>Comparação</td>
<td>Produz <code>boolean</code></td>
</tr>
<tr>
<td>Operadores lógicos</td>
<td>Exigem <code>boolean</code> nos dois lados</td>
</tr>
<tr>
<td>Função na tabela de símbolos</td>
<td>Registra a função com tipo <code>function</code></td>
</tr>
<tr>
<td>Parâmetros da função</td>
<td>Existem no corpo; não vazam para fora; duplicados geram erro</td>
</tr>
<tr>
<td><code>return</code></td>
<td>Só dentro de função; valida variáveis; infere tipo ou <code>void</code></td>
</tr>
<tr>
<td><code>break</code>/<code>continue</code> fora de laço</td>
<td>Erro semântico no describe principal</td>
</tr>
<tr>
<td><code>console.log</code></td>
<td>Chamada nativa aceita</td>
</tr>
<tr>
<td>Chamada não declarada</td>
<td>Erro ao chamar identificador inexistente</td>
</tr>
<tr>
<td>Pipeline léxico → sintático → semântico</td>
<td><code>run</code> consome a AST e preenche <code>tabelaSimbolos</code></td>
</tr>
<tr>
<td>Pipeline com função e <code>return</code></td>
<td>Programa completo passa pelas três etapas</td>
</tr>
<tr>
<td>Laços <code>while</code>/<code>for</code> (legado no describe principal)</td>
<td>Quatro <em>test.skip</em> aguardando remoção (substituídos pela suite de laços)</td>
</tr>
</tbody>
</table>

</details>

<details>
<summary>
  <kbd>▶</kbd>
  <strong>Casos de teste — laços <code>for</code> e <code>while</code></strong>
  <em>(clique para expandir)</em>
</summary>

<table>
<thead>
<tr>
<th>Caso</th>
<th>Descrição</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>for</code> válido</td>
<td>Laço clássico com <code>let</code> na inicialização é aceito</td>
</tr>
<tr>
<td>Escopo do <code>for</code></td>
<td>Variável da inicialização visível na condição, atualização e corpo</td>
</tr>
<tr>
<td><code>for (;;)</code></td>
<td>Cabeçalho vazio com <code>break</code> no corpo</td>
</tr>
<tr>
<td>Inicialização por expressão</td>
<td><code>for (i = 0; ...)</code> usa variável já declarada</td>
</tr>
<tr>
<td><code>break</code>/<code>continue</code> no <code>for</code></td>
<td>Permitidos dentro do corpo do laço</td>
</tr>
<tr>
<td>Laços consecutivos</td>
<td>Reutiliza o nome <code>i</code> em dois <code>for</code> seguidos</td>
</tr>
<tr>
<td>Tipo na inicialização</td>
<td>Anota <code>tipoInferido</code> da variável do cabeçalho</td>
</tr>
<tr>
<td>Condição não booleana</td>
<td><code>for (let i = 0; 1; ...)</code> lança erro</td>
</tr>
<tr>
<td>Variável do laço não vaza</td>
<td><code>i</code> do <code>for</code> não existe após o laço</td>
</tr>
<tr>
<td>Condição/atualização inválidas</td>
<td>Identificador não declarado em condição ou em <code>+=</code> gera erro</td>
</tr>
<tr>
<td><code>const</code> no <code>for</code></td>
<td>Erro ao atualizar variável <code>const</code> no cabeçalho</td>
</tr>
<tr>
<td>Atualização incompatível</td>
<td><code>i += "a"</code> rejeitado</td>
</tr>
<tr>
<td>Sombreamento no corpo</td>
<td>Variável externa homônima e <code>let</code> interno no corpo</td>
</tr>
<tr>
<td>Corpo inválido</td>
<td>Uso de variável não declarada no corpo lança erro</td>
</tr>
<tr>
<td><code>break</code>/<code>continue</code> fora de laço</td>
<td>Erro na suite de laços (complementa o describe principal)</td>
</tr>
<tr>
<td><code>break</code> em função aninhada</td>
<td>Erro quando <code>break</code> está dentro de <code>function</code> no corpo do laço</td>
</tr>
<tr>
<td><code>while</code> válido</td>
<td>Laço com <code>break</code> condicional aceito</td>
</tr>
<tr>
<td><code>while</code> não booleano</td>
<td>Condição numérica lança erro</td>
</tr>
<tr>
<td>Corpo do <code>while</code></td>
<td>Variável não declarada no corpo lança erro</td>
</tr>
<tr>
<td>Condição <code>any</code></td>
<td>Parâmetro de função usado em <code>if</code> e <code>for</code> é aceito</td>
</tr>
</tbody>
</table>

</details>

## Integração — pipeline completo (`Compiler`)

Arquivo de testes: `src/Compiler.integration.spec.ts`.

Exercita `Compiler.compile()` com o carregamento real de analisadores e geradores
(via `prebuild`). Valida o artefato `codigoGerado` e garante que falhas nas etapas
anteriores **não** deixam Go parcial de compilações anteriores.

<details>
<summary>
  <kbd>▶</kbd>
  <strong>Casos de teste de integração</strong>
  <em>(clique para expandir)</em>
</summary>

<table>
<thead>
<tr>
<th>Caso</th>
<th>Descrição</th>
</tr>
</thead>
<tbody>
<tr>
<td>Declarações <code>let</code>/<code>const</code></td>
<td>Pipeline completo gera <code>package main</code> e corpo tipado em <code>func main</code></td>
</tr>
<tr>
<td>Atribuições compostas</td>
<td><code>=</code>, <code>+=</code> e <code>-=</code> aparecem no Go emitido</td>
</tr>
<tr>
<td><code>console.log</code></td>
<td>Inclui <code>import "fmt"</code> e <code>fmt.Println</code></td>
</tr>
<tr>
<td>Função de topo + chamada</td>
<td>Emite assinatura Go com inferência (<code>func soma(...) float64</code>)</td>
</tr>
<tr>
<td>Erro semântico</td>
<td><code>compile()</code> retorna <code>false</code> e <code>codigoGerado</code> fica indefinido</td>
</tr>
<tr>
<td>Erro sintático</td>
<td>Pipeline para no sintático; preenche <code>errosSintaticos</code> sem gerar Go</td>
</tr>
<tr>
<td>Reuso do <code>Compiler</code></td>
<td>Segunda <code>compile()</code> na mesma instância não duplica loaders e substitui a saída Go</td>
</tr>
</tbody>
</table>

</details>
