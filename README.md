# Compilador JavaScript para Go

Este projeto consiste no desenvolvimento de um compilador básico que traduz código da linguagem **JavaScript** (baseado no padrão ECMAScript TC39) para a linguagem **Go** (Golang). 

Este é um projeto contínuo, desenvolvido ao longo do semestre para a disciplina de Compiladores.

## 📚 Documentação Técnica

Este README serve como visão geral do projeto. Para informações detalhadas sobre as regras adotadas, gramática e decisões de design, consulte nossa documentação:

* [Especificação da Linguagem e Escopo](./docs/README.md)

## 🗺️ Roadmap de Desenvolvimento

O progresso do compilador seguirá as etapas clássicas de compilação:

- [x] **Analisador Léxico:** Tokenização do código-fonte.
- [x] **Analisador Sintático:** Construção da Árvore Sintática Abstrata (AST).
- [x] **Analisador Semântico:** Verificação de tipos e regras de escopo.
- [x] **Geração de Código Go:** Tradução da AST validada para arquivos `.go` (sem IR nem otimizador neste projeto).

## 🚀 Como Executar (Localmente)

**Pré-requisitos:**
* Node JS (versão 24.20.0 ou superior)
* BunJS (versão 1.4.0 ou superior)

para executar normalmente
```bash
  bun start
```
para executar com logs
```bash
  bun start --verbose
```
para imprimir a AST na execução 
```bash
  bun start --ast
```
para abrir o modo de uso
```bash
  bun start --help
```
para executar a suite de testes
```bash
  bun test
```

Os testes unitários usam `bun:test` e ficam ao lado do código-fonte com sufixo `.spec.ts` (ex.: `src/analyzers/Lexycal.analyzer.spec.ts`). Cada fase do compilador testa sua lógica pura; o pipeline completo até Go é coberto em `src/Compiler.integration.spec.ts` (ver `docs/Testes.md`).

## 🚀 Como Executar (Conteiner)

**Pré-requisitos:**
* Docker (versão 29.7.2, ou superior)

```bash
  docker build -t compilador .
```

para executar em modo hot reload 
```bash
  docker run --rm -v $(pwd):/app compilador run --hot index.ts
```

para executar a suite de testes 
```bash
  docker run --rm compilador test
```

para executar passando argumentos
```bash
  # Isso equivale a rodar `bun start --input 'aaaaaa'`
  docker run --rm compilador start --input 'aaaaaa'
```
## 🤝 Contribuindo 

1.  Execute o comando ``git pull``.
2.  Crie uma Branch para sua Feature (`git checkout -b feature/MinhaNovaFeature`).
3.  Commit suas mudanças (`git commit -m 'Adiciona MinhaNovaFeature'`).
4.  Push para a Branch (`git push origin feature/MinhaNovaFeature`).
5.  Abra um Pull Request.
