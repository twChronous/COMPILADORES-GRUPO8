# Compilador JavaScript → Go

Repositório do compilador JavaScript para Go do Grupo 8. Toda a especificação técnica está concentrada em [docs/](./docs/README.md) e os exemplos práticos em [examples/](./examples/README.md).

[Documentação](./docs/README.md) · [Escopo](./docs/Escopo.md) · [Arquitetura](./docs/Arquitetura.md) · [Sintático](./docs/Sintatico.md) · [Semântico](./docs/Semantico.md) · [Tradução JS → Go](./docs/Traducao.md) · [Testes](./docs/Testes.md) · [Exemplos](./examples/README.md)

## Instalação

Baixe o executável correspondente ao seu sistema operacional na página de [Releases](https://github.com/twChronous/COMPILADORES-GRUPO8/releases):

- **Linux:** `compilador-linux`
- **Windows:** `compilador-windows.exe`
- **macOS:** `compilador-macos-intel` ou `compilador-macos-silicon`

No Linux ou macOS, dê permissão de execução ao binário antes de rodar:

```bash
chmod +x compilador-linux
```

## Como executar

Formato geral da CLI (substitua `./compilador-linux` por `compilador-windows.exe` no Windows ou pelo binário do macOS):

```bash
./compilador-linux [arquivo.js] [saida.go] [opcoes]
```

**Comportamento das opções:**

- **Sem flags nem `<saida>.go`:** valida e compila silenciosamente (não imprime nem gera arquivos; retorna código `1` se houver erro).
- **`<saida>.go` (ou `-o`, `--out`, `--output <arquivo>`):** grava o código Go no caminho informado.
- **`--go`:** imprime o código Go gerado no terminal.
- **`--json [arquivo.json]`:** salva o output da compilação em JSON (padrão: `output.json`). Pode ser combinado com `--tokens`, `--ast`, `--ts` e `--go` para filtrar os campos gravados.
- **`--tokens`, `--ast`, `--ts`, `--verbose`, `-h` / `--help`:** inspeção de etapas, logs detalhados e ajuda.

Exemplos:

```bash
# Gerar arquivo .go diretamente (ou usando --output / --out / -o)
./compilador-linux entrada.js saida.go
./compilador-linux entrada.js --output saida.go

# Imprimir Go no terminal
./compilador-linux entrada.js --go

# Salvar artefatos em JSON (completo ou filtrado)
./compilador-linux entrada.js --json
./compilador-linux entrada.js --ast --tokens --json relatorio.json

# Exibir ajuda
./compilador-linux --help
```

Para executar ou compilar o `.go` gerado, é necessário ter o **Go** instalado:

```bash
go run saida.go
go build -o programa saida.go
```

Mais exemplos prontos em [examples/README.md](./examples/README.md).

## Ambiente de desenvolvimento

**Pré-requisitos:** [Bun](https://bun.sh/) (`>= 1.4.0`), **Go** (opcional, para rodar os arquivos `.go` gerados) e **Docker** (opcional).

```bash
bun install                          # Instala as dependências
bun start [arquivo.js] [saida.go]    # Executa prebuild (registries) + src/index.ts
bun test                             # Executa a suíte de testes (ver docs/Testes.md)
bunx tsc --noEmit                    # Valida a tipagem TypeScript
bun run build-comp                   # Gera o binário standalone em ./dist/compilador
```

Na execução em desenvolvimento, `bun start` passa as mesmas flags da CLI diretamente para `src/index.ts` (ex.: `bun start examples/funcoes.js --go`).

### Docker

```bash
docker build -t compilador .
docker run --rm compilador start --go
docker run --rm compilador test
```

## Contribuindo

1. Atualize sua base com `git pull`.
2. Crie uma branch para sua alteração (`git checkout -b feature/MinhaAlteracao`).
3. Faça commit e push das mudanças.
4. Abra um Pull Request para a `main`.
