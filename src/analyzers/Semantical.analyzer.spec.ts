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

const enquanto = (condicao: any, corpo: NoStatement[]): NoStatement => ({
  tipo: "DeclaracaoWhile",
  condicao,
  corpo: bloco(corpo),
  linha: l,
  coluna: c
});

const lacoFor = (
  inicializacao: NoStatement | null,
  condicao: any,
  atualizacao: any,
  corpo: NoStatement[]
): NoStatement =>
  ({
    tipo: "DeclaracaoFor",
    inicializacao,
    condicao,
    atualizacao,
    corpo: bloco(corpo),
    linha: l,
    coluna: c,
  }) as unknown as NoStatement;

const membro = (objeto: any, propriedade: string) => ({
  tipo: "AcessoMembro" as const,
  objeto,
  propriedade,
  linha: l,
  coluna: c
});

const chamada = (callee: any, argumentos: any[]) => ({
  tipo: "ChamadaFuncao" as const,
  callee,
  argumentos,
  linha: l,
  coluna: c
});

const interrupcao = (): NoStatement => ({
  tipo: "BreakStatement",
  linha: l,
  coluna: c
});

const continua = (): NoStatement => ({
  tipo: "ContinueStatement",
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

  test("break fora de laço deve gerar erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([interrupcao()])).toThrow(
      /'break' só pode ser usado dentro de um laço/
    );
  });

  test("continue fora de laço deve gerar erro semântico", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() => analyzer.analisar([continua()])).toThrow(
      /'continue' só pode ser usado dentro de um laço/
    );
  });

  test("chamada de função nativa console.log é aceita", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        expr(chamada(membro(id("console"), "log"), [str("oi")])),
      ])
    ).not.toThrow();
  });

  test("chamada com identificador não declarado lança erro", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([expr(chamada(id("soma"), [num("1")]))])
    ).toThrow(/A variável 'soma' não foi declarada/);
  });

  test("operadores lógicos exigem boolean nos dois lados", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([decl("let", "ok", bin("&&", num("1"), bool("true")))])
    ).toThrow(/O operador '&&' não aceita/);
  });

  test("pipeline: função com return passa pelo léxico, sintático e semântico", () => {
    const client = cliente();
    const lex = new LexAnalyzer(client);
    lex.run({
      input: "function dobro(x) { return x * 2; } let r = dobro(3);",
    });

    const sintatico = new SyntacticAnalyzer(client);
    expect(sintatico.run()).toBe(true);

    const semantico = new SemanticalAnalyzer(client);
    expect(semantico.run()).toBe(true);
    expect(client.ast?.[0]).toMatchObject({ tipo: "DeclaracaoFuncao", nome: "dobro" });
  });

  // Verificação semântica de while ainda não trata DeclaracaoWhile na main (#43 / PR #57/#58).
  test.skip("while: condição deve ser boolean", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([enquanto(num("1"), [])])
    ).toThrow(/condição.*while.*boolean/i);
  });

  test.skip("while: variável do corpo não vaza para fora", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        enquanto(bool("true"), [decl("let", "y", num("1"))]),
        expr(id("y")),
      ])
    ).toThrow(/A variável 'y' não foi declarada/);
  });

  test.skip("while: break dentro do laço é permitido", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([enquanto(bool("true"), [interrupcao()])])
    ).not.toThrow();
  });

  // Parsing/semântica de for ainda não estão na main (#39 / #44 / PR #57).
  test.skip("for: condição deve ser boolean", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        lacoFor(decl("let", "i", num("0")), num("1"), bin("=", id("i"), num("1")), []),
      ])
    ).toThrow(/condição.*for.*boolean/i);
  });

  test.skip("for: variável da inicialização não vaza para fora", () => {
    const analyzer = new SemanticalAnalyzer(cliente());

    expect(() =>
      analyzer.analisar([
        lacoFor(decl("let", "i", num("0")), bin("<", id("i"), num("10")), null, []),
        expr(id("i")),
      ])
    ).toThrow(/A variável 'i' não foi declarada/);
  });
});