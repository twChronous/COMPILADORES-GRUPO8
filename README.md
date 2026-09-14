# Compilador JavaScript para Go

Este projeto consiste no desenvolvimento de um compilador básico que traduz código da linguagem **JavaScript** (baseado no padrão ECMAScript TC39) para a linguagem **Go** (Golang). 

Este é um projeto contínuo, desenvolvido ao longo do semestre para a disciplina de Compiladores.

## 📚 Documentação Técnica

Este README serve como visão geral do projeto. Para informações detalhadas sobre as regras adotadas, gramática e decisões de design, consulte nossa documentação:

* [Especificação da Linguagem e Escopo](./docs/README.md)

## 🗺️ Roadmap de Desenvolvimento

O progresso do compilador seguirá as etapas clássicas de compilação:

- [ ] **Analisador Léxico:** Tokenização do código-fonte.
- [ ] **Analisador Sintático:** Construção da Árvore Sintática Abstrata (AST).
- [ ] **Analisador Semântico:** Verificação de tipos e regras de escopo.
- [ ] **Gerador de Código Intermediário:** Representação intermediária (IR).
- [ ] **Otimizador de Código:** Melhorias de performance na IR.
- [ ] **Geração de Código Final:** Tradução final para arquivos `.go`.

## 🚀 Como Executar (Localmente)

**Pré-requisitos:**
* Node JS (versão 24.20.0 ou superior)
* BunJS (versão 1.4.0 ou superior)

para executar normalmente
```bash
  bun start
```
para executar a suite de testes
```bash
  bun test
```

Os testes unitários usam `bun:test` e ficam ao lado do código-fonte com sufixo `.spec.ts` (ex.: `src/analyzers/Lexycal.analyzer.spec.ts`). Cada fase do compilador deve testar sua lógica pura (ex.: `tokenize`), não o pipeline completo.

## 🚀 Como Executar (Conteiner)

**Pré-requisitos:**
* Docker (versão 29.7.2, ou superior)

```bash
  docker build -t Compilador .
```

para executar em modo hot reload 
```bash
  docker run --rm -v $(pwd):/app Compilador run --hot index.ts
```

para executar a suite de testes 
```bash
  docker run --rm Compilador test
```

para executar passando argumentos
```bash
  # Isso equivale a rodar `bun start --input 'aaaaaa'`
  docker run --rm Compilador start --input 'aaaaaa'
```
## 🤝 Contribuindo 

1.  Execute o comando ``git pull``.
2.  Crie uma Branch para sua Feature (`git checkout -b feature/MinhaNovaFeature`).
3.  Commit suas mudanças (`git commit -m 'Adiciona MinhaNovaFeature'`).
4.  Push para a Branch (`git push origin feature/MinhaNovaFeature`).
5.  Abra um Pull Request.
