import { describe, expect, test } from "bun:test";
import SemanticalAnalyzer from "./Semantical.analyzer";
import SyntacticAnalyzer from "./Syntactic.analyzer";
import LexAnalyzer from "./Lexycal.analyzer";
import type { ClientInterface, NoStatement } from "../utils/types";

function cliente(): ClientInterface {
  return {
    tokens: [],
    analyzers: [],
    LOG() {},
    LOG_ERR() {},
    LOG_WARN() {},
    Error() {},
  };
}

// Valores fixos de localização para evitar poluição nos mocks de teste
const l = 1;
const c = 1;

const num = (valor: string) => ({ tipo: "Literal" as const, tipoDado: "NUMERO" as const, valor, linha: l, coluna: c });
const str = (valor: string) => ({ tipo: "Literal" as const, tipoDado: "STRING" as const, valor, linha: l, coluna: c });
const bool = (valor: string) => ({ tipo: "Literal" as const, tipoDado: "BOOLEAN" as const, valor, linha: l, coluna: c });
const id = (nome: string) => ({ tipo: "Identificador" as const, nome, linha: l, coluna: c });

const bin = (operador: string, esquerda: any, direita: any) => ({
  tipo: "ExpressaoBinaria" as const,
  operador,
  esquerda,
  direita,
  linha: l,
  coluna: c
});

const decl = (modificador: "let" | "const" | "var", nome: string, valorInicial: any): NoStatement => ({
  tipo: "DeclaracaoVariavel",
  modificador,
  nome,
  valorInicial,
  linha: l,
  coluna: c
});

const expr = (expressao: any): NoStatement => ({ tipo: "ExpressaoStatement", expressao, linha: l, coluna: c });

const bloco = (corpo: NoStatement[]) => ({ tipo: "Bloco" as const, corpo, linha: l, coluna: c });

const se = (condicao: any, consequencia: NoStatement[], alternativa: NoStatement[] | null = null): NoStatement => ({
  tipo: "DeclaracaoIf",
  condicao,
  consequencia: bloco(consequencia),
  alternativa: alternativa ? bloco(alternativa) : null,
  linha: l,
  coluna: c
});

describe("SemanticalAnalyzer", () => {
  test("analisar: declaração let com número anota o tipo number", () => {
    const analyzer = new SemanticalAnalyzer(cliente());
    const [no] = analyzer.analisar([decl("let", "x", num("10"))]);

    expect(no).toMatchObject({
      tipo: "DeclaracaoVariavel",
      nome: "x",
      tipoInferido: "number",
    });
  });

  test("analisar: uso de variável não declarada lança erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([expr(id("a"))])).toThrow(
      /A variável 'a' não foi declarada/
    );
  });

  test("analisar: redeclaração no mesmo escopo lança erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([decl("let", "x", num("1")), decl("const", "x", num("2"))])
    ).toThrow(/A variável 'x' já foi declarada neste escopo/);
  });

  test("analisar: variável do escopo externo é visível no bloco do if", () => {
    const analyzer = new SemanticalAnalyzer(cliente());
    const corpo = analyzer.analisar([
      decl("let", "x", num("1")),
      se(bool("true"), [expr(bin("+", id("x"), num("1")))]),
    ]);

    expect(corpo[1]).toMatchObject({ tipo: "DeclaracaoIf" });
  });

  test("analisar: variável declarada no bloco do if não vaza para fora", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        se(bool("true"), [decl("let", "y", num("1"))]),
        expr(id("y")),
      ])
    ).toThrow(/A variável 'y' não foi declarada/);
  });

  test("analisar: const não pode ser reatribuída", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        decl("const", "x", num("1")),
        expr(bin("=", id("x"), num("2"))),
      ])
    ).toThrow(/Não é possível reatribuir valor à constante 'x'/);
  });

  test("analisar: let aceita reatribuição do mesmo tipo", () => {
    const analyzer = new SemanticalAnalyzer(cliente());
    const corpo = analyzer.analisar([
      decl("let", "x", num("1")),
      expr(bin("=", id("x"), num("2"))),
    ]);

    expect(corpo[1]).toMatchObject({
      tipo: "ExpressaoStatement",
      expressao: { tipoInferido: "number" },
    });
  });

  test("analisar: atribuição com tipo diferente lança erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        decl("let", "x", num("1")),
        expr(bin("=", id("x"), str("a"))),
      ])
    ).toThrow(/Atribuição incompatível para 'x'/);
  });

  test("analisar: condição do if precisa ser boolean", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([se(num("1"), [])])).toThrow(
      /A condição do 'if' deve ser boolean/
    );
  });

  test("analisar: soma de números é number e string com número é erro", () => {
    const analyzer = new SemanticalAnalyzer(cliente());
    const [ok] = analyzer.analisar([decl("let", "n", bin("+", num("1"), num("2")))]);

    expect(ok).toMatchObject({ tipoInferido: "number" });

    expect(() => analyzer.analisar([decl("let", "s", bin("+", str("a"), num("1")))])).toThrow(
      /O operador '\+' não aceita os operandos de tipos 'string' e 'number'/
    );
  });

  test("analisar: comparação produz boolean", () => {
    const analyzer = new SemanticalAnalyzer(cliente());
    const [no] = analyzer.analisar([decl("let", "ok", bin(">", num("2"), num("1")))]);

    expect(no).toMatchObject({ tipoInferido: "boolean" });
  });

  test("analisar: sombreamento em escopo interno é permitido", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        decl("let", "x", num("1")),
        se(bool("true"), [decl("let", "x", str("a"))]),
      ])
    ).not.toThrow();
  });

  test("run: consome a AST deixada pelo analisador sintático", () => {
    const client = cliente();
    const lex = new LexAnalyzer(client);
    lex.run({ input: "let x = 10; if (x > 5) { x = x + 1; }" });

    const sintatico = new SyntacticAnalyzer(client);
    sintatico.run();

    const semantico = new SemanticalAnalyzer(client);
    expect(semantico.run()).toBe(true);
    expect(client.ast?.[0]).toMatchObject({
      tipo: "DeclaracaoVariavel",
      nome: "x",
      tipoInferido: "number",
    });
  });
});