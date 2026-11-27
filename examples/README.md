
# Exemplos de compilação JavaScript para Go

Este diretório contém exemplos práticos das funcionalidades
suportadas pelo compilador JavaScript para Go do Grupo 8.

## Pré-requisitos

- Bun instalado.
- Go instalado e disponível no PATH.

Na raiz do projeto, instale as dependências:

```bash
bun install
```

## Exemplos disponíveis

| Arquivo | Funcionalidades |
| --- | --- |
| aritmetica.js | Variáveis, constantes e operações aritméticas |
| controle-fluxo.js | While, if e else |
| funcoes.js | Funções, parâmetros e retorno |

## Gerando os arquivos Go

```bash
mkdir -p dist/examples

bun start examples/aritmetica.js --output dist/examples/aritmetica.go
bun start examples/controle-fluxo.js --output dist/examples/controle-fluxo.go
bun start examples/funcoes.js --output dist/examples/funcoes.go
```

A flag `--output` define o caminho do arquivo Go gerado.
As opções `--out` e `-o` também são aceitas.

## Executando os programas

```bash
go run dist/examples/aritmetica.go
go run dist/examples/controle-fluxo.go
go run dist/examples/funcoes.go
```

## Resultados esperados

### Aritmética

```text
30
```

### Controle de fluxo

```text
1
2
3
4
5
Contagem finalizada
```

### Funções

```text
30
```

## Compilando os executáveis

```bash
go build -o dist/examples/aritmetica.exe dist/examples/aritmetica.go
go build -o dist/examples/controle-fluxo.exe dist/examples/controle-fluxo.go
go build -o dist/examples/funcoes.exe dist/examples/funcoes.go
```

No Linux ou macOS, a extensão `.exe` pode ser omitida.

## Tratamento de erros

Caso a compilação falhe, o compilador apresenta uma mensagem
de erro, retorna código de saída diferente de zero e não
grava o código Go.

## Testes automatizados

```bash
bun test ./src/index.spec.ts
```

## Observação

Os arquivos Go e executáveis gerados ficam no diretório `dist/`,
que não é versionado pelo Git.
