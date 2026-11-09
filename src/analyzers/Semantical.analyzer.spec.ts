import { describe, expect, test } from "bun:test";
import SemanticalAnalyzer from "./Semantical.analyzer";
import SyntacticAnalyzer from "./Syntactic.analyzer";
import LexAnalyzer from "./Lexycal.analyzer";
import type {
  ClientInterface,
  NoStatement,
  NoExpressao
} from "../utils/types";

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

const funcao = (
  nome: string,
  parametros: string[],
  corpo: NoStatement[]
): NoStatement => ({
  tipo: "DeclaracaoFuncao",
  nome,
  parametros: parametros.map(nome => ({
    tipo: "Parametro",
    nome,
    linha: l,
    coluna: c
  })),
  corpo: bloco(corpo),
  linha: l,
  coluna: c
});

const retorno = (
  argumento: NoExpressao | null
): NoStatement => ({
  tipo: "ReturnStatement",
  argumento,
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

  test("função deve ser registrada na tabela de símbolos", () => {
    const client = cliente();

    client.ast = [
      funcao("soma", ["a", "b"], [
        retorno(bin("+", id("a"), id("b")))
      ])
    ];

    const analyzer = new SemanticalAnalyzer(client);

    expect(analyzer.run()).toBe(true);

    expect(client.tabelaSimbolos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nome: "soma",
          tipo: "function",
          escopo: "Global"
        })
      ])
    );
  });

  test("parâmetros devem existir no escopo da função", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([
      funcao("dobro", ["x"], [
        retorno(bin("*", id("x"), num("2")))
      ])
    ])).not.toThrow();
  });

  test("parâmetros não devem ser acessíveis fora da função", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([
      funcao("teste", ["x"], [
        retorno(id("x"))
      ]),
      expr(id("x"))
    ])).toThrow(/A variável 'x' não foi declarada/);
  });

  test("return fora de função deve gerar erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([
      retorno(num("10"))
    ])).toThrow(/'return' só pode ser usado dentro/);
  });

  test("parâmetros duplicados devem gerar erro", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([
      funcao("soma", ["a", "a"], [
        retorno(id("a"))
      ])
    ])).toThrow(/já foi declarada neste escopo/);
  });

  test("return deve validar variáveis utilizadas", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([
      funcao("teste", [], [
        retorno(id("inexistente"))
      ])
    ])).toThrow(
      /A variável 'inexistente' não foi declarada/
    );
  });

  test("expressão retornada deve receber tipo inferido", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    const [resultado] = analyzer.analisar([
      funcao("numero", [], [
        retorno(num("10"))
      ])
    ]);

    expect(resultado).toMatchObject({
      tipo: "DeclaracaoFuncao",
      corpo: {
        corpo: [
          {
            tipo: "ReturnStatement",
            argumento: {
              tipo: "Literal",
              tipoInferido: "number"
            }
          }
        ]
      }
    });
  });

  test("return com valor deve registrar seu tipo inferido", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    const [resultado] = analyzer.analisar([
      funcao("numero", [], [
        retorno(num("10"))
      ])
    ]);

    expect(resultado).toMatchObject({
      tipo: "DeclaracaoFuncao",
      corpo: {
        corpo: [
          {
            tipo: "ReturnStatement",
            tipoInferido: "number",
            argumento: {
              tipoInferido: "number"
            }
          }
        ]
      }
    });
  });

  test("return sem valor deve inferir void", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    const [resultado] = analyzer.analisar([
      funcao("sair", [], [
        retorno(null)
      ])
    ]);

    expect(resultado).toMatchObject({
      tipo: "DeclaracaoFuncao",
      corpo: {
        corpo: [
          {
            tipo: "ReturnStatement",
            argumento: null,
            tipoInferido: "void"
          }
        ]
      }
    });
  });
}); 

function semantico(codigo: string): NoStatement[] {
  const client = cliente();
  new LexAnalyzer(client).run({ input: codigo });

  const sintatico = new SyntacticAnalyzer(client);
  expect(sintatico.run()).toBe(true);

  return new SemanticalAnalyzer(client).analisar(client.ast!);
}

describe("SemanticalAnalyzer - laços (for e while)", () => {
  // ---------- for: casos válidos ----------
  test("for: laço clássico válido é aceito", () => {
    expect(() => semantico("for (let i = 0; i < 3; i += 1) { let x = i + 1; }")).not.toThrow();
  });

  test("for: variável de inicialização é visível na condição, atualização e corpo", () => {
    expect(() =>
      semantico("let total = 0; for (let i = 0; i < 10; i += 1) { total += i; }")
    ).not.toThrow();
  });

  test("for: partes omitidas (for (;;)) com break são aceitas", () => {
    expect(() => semantico("for (;;) { break; }")).not.toThrow();
  });

  test("for: inicialização por expressão usa variável já declarada", () => {
    expect(() =>
      semantico("let i = 0; for (i = 0; i < 3; i += 1) { }")
    ).not.toThrow();
  });

  test("for: permite break e continue dentro do corpo", () => {
    expect(() =>
      semantico("for (let i = 0; i < 5; i += 1) { if (i > 2) { break; } continue; }")
    ).not.toThrow();
  });

  test("for: variável do laço pode ser reutilizada em laços seguidos", () => {
    expect(() =>
      semantico("for (let i = 0; i < 2; i += 1) { } for (let i = 0; i < 2; i += 1) { }")
    ).not.toThrow();
  });

  test("for: anota o tipo inferido da variável de inicialização", () => {
    const [no] = semantico("for (let i = 0; i < 3; i += 1) { }");

    expect(no).toMatchObject({
      tipo: "DeclaracaoFor",
      inicializacao: { nome: "i", tipoInferido: "number" },
      condicao: { tipoInferido: "boolean" },
    });
  });

  // for: casos inválidos 
  test("for: condição não booleana lança erro", () => {
    expect(() => semantico("for (let i = 0; 1; i += 1) { }")).toThrow(
      /A condição do 'for' deve ser boolean, encontrado 'number'/
    );
  });

  test("for: variável do laço não vaza para fora do escopo", () => {
    expect(() =>
      semantico("for (let i = 0; i < 3; i += 1) { } i = 1;")
    ).toThrow(/A variável 'i' não foi declarada/);
  });

  test("for: variável não declarada na condição lança erro", () => {
    expect(() => semantico("for (let i = 0; j < 3; i += 1) { }")).toThrow(
      /A variável 'j' não foi declarada/
    );
  });

  test("for: variável não declarada na atualização lança erro", () => {
    expect(() => semantico("for (let i = 0; i < 3; j += 1) { }")).toThrow(
      /A variável 'j' não foi declarada/
    );
  });

  test("for: atualizar uma const lança erro", () => {
    expect(() => semantico("for (const i = 0; i < 3; i += 1) { }")).toThrow(
      /Não é possível reatribuir valor à constante 'i'/
    );
  });

  test("for: atualização com tipo incompatível lança erro", () => {
    expect(() => semantico("for (let i = 0; i < 3; i += \"a\") { }")).toThrow(
      /O operador '\+=' não suporta os tipos 'number' e 'string'/
    );
  });

  test("for: variável externa homônima e sombreamento no corpo são permitidos", () => {
    expect(() =>
      semantico("for (let i = 0; i < 3; i += 1) { } let i = 1; i = 2; for (let k = 0; k < 1; k += 1) { let k = 1; k = 2; }")
    ).not.toThrow();
  });

  test("for: variável usada no corpo e não declarada lança erro", () => {
    expect(() => semantico("for (let i = 0; i < 3; i += 1) { y = 1; }")).toThrow(
      /A variável 'y' não foi declarada/
    );
  });

  // break / continue 
  test("break fora de laço lança erro", () => {
    expect(() => semantico("break;")).toThrow(/'break' só pode ser usado dentro de um laço/);
  });

  test("continue fora de laço lança erro", () => {
    expect(() => semantico("continue;")).toThrow(/'continue' só pode ser usado dentro de um laço/);
  });

  test("break dentro de função declarada dentro de um laço lança erro", () => {
    expect(() =>
      semantico("for (let i = 0; i < 3; i += 1) { function f() { break; } }")
    ).toThrow(/'break' só pode ser usado dentro de um laço/);
  });

  // while
  test("while: laço válido com break é aceito", () => {
    expect(() => semantico("let n = 0; while (n < 3) { n += 1; if (n > 1) { break; } }")).not.toThrow();
  });

  test("while: condição não booleana lança erro", () => {
    expect(() => semantico("while (1) { }")).toThrow(
      /A condição do 'while' deve ser boolean, encontrado 'number'/
    );
  });

  test("while: o corpo é verificado (variável não declarada lança erro)", () => {
    expect(() => semantico("while (true) { z = 1; }")).toThrow(
      /A variável 'z' não foi declarada/
    );
  });

  // condição com any
  test("condição com tipo any (parâmetro de função) é aceita no if e no for", () => {
    expect(() =>
      semantico("function f(n) { if (n > 1) { return n; } for (let i = 0; i < n; i += 1) { } }")
    ).not.toThrow();
  }); 
});