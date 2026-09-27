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
