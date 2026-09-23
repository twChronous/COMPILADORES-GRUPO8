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

| JavaScript (Origem) | Go (Destino) |
| --- | --- |
| `Number` | `float64` |
| `String` | `string` |
| `Boolean` | `bool` |

## 2. Declaração e Atribuição de Variáveis

- **Suportado:** `let` e `const` .
- **Não Suportado:** `var`

**Comparativo de Tradução:**

```jsx
````
// Entrada: JavaScript
let contador = 10;
const saudacao = "Olá Mundo";
```

```go
````
//Saída: Go
var contador float64 = 10
const saudacao = "Olá Mundo"
```

## 3. Operadores

| **Categoria** | **Operadores** |
| --- | --- |
| **Aritméticos** | `+`, `-`, `*`, `/`, `%` |
| **Atribuição** | `=`, `+=`, `-=` |
| **Relacionais** | `>`, `<`, `>=`, `<=`, `==`, `!=` |
| **Lógicos** | `&&`, ` |

## 4. Controle de Fluxo

O Go simplifica loops usando apenas a palavra reservada `for` .

**Condicionais:** `if`, `else` , `else if` .

**Laços de Repetição:**

```jsx
````
//Entrada JavaScript
while (condicao) { ... }
for (let i = 0; i < 10; i++) { ... }
```

```go
````
//Saída: Go
for condicao { ... }
for i:= 0; float64(i) < 10; i++ { ... }
```

## 5. Funções

Apenas declarações de funções clássicas nomeadas estarão no escopo.

- Declaração clássica: `function nome(param) { return ... }`.
- **Tradução:** Mapeado para `func nome(param tipo) tipo { ... }`.

```jsx
```` 
//Entrada: JavaScript
function calcularArea(raio) {
	return 3.14 * raio * raio;
}
```

```go
````
//Saída: Go
func calcularArea(raio float64) float64 {
	return 3.14 * raio * raio
}
```

## 6. Entrada e Saída (I/O)

- **JS `console.log(...)`** ➔ Traduzido para **Go `fmt.Println(...)`** com a importação do pacote `fmt`.

## Fora do Escopo

Para garantir a entrega do projeto com qualidade técnica no prazo acadêmico estipulado, as seguintes *features* **NÃO** serão suportadas nesta versão do compilador:

1. **Orientação a Objetos:** Classes, `Prototypes`, herança, `this` e operador `new`.
2. **Assincronicidade:** `async`, `await`, `Promises`, APIs de Timer (`setTimeout`).
3. **Tratamento de Exceções:** Blocos `try`, `catch`, `finally` e `throw`.
4. **Tipagem Dinâmica Fraca:** Mudança de tipos em tempo de execução (tratado como erro semântico).
5. **Estruturas Complexas:** Arrays de tipos mistos, Objetos literais dinâmicos e *Arrow Functions*.