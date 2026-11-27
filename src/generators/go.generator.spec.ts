import { describe, expect, test } from "bun:test";
import GoGenerator from "./go.generator";
import LexAnalyzer from "../analyzers/Lexycal.analyzer";
import SyntacticAnalyzer from "../analyzers/Syntactic.analyzer";
import SemanticalAnalyzer from "../analyzers/Semantical.analyzer";
import type {
  ClientInterface,
  NoBloco,
  NoExpressao,
  NoStatement,
  TipoSemantico,
} from "../utils/types";

function cliente(onErr?: (msg: string) => void): ClientInterface {
  return {
    tokens: [],
    analyzers: [],
    generators: [],
    LOG() {},
    LOG_ERR(msg: string) {
      onErr?.(msg);
    },
    LOG_WARN() {},
    Error() {},
  };
}

const l = 1;
const c = 1;

const num = (valor: string, tipoInferido?: TipoSemantico): NoExpressao => ({
  tipo: "Literal",
  tipoDado: "NUMERO",
  valor,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const str = (valor: string, tipoInferido?: TipoSemantico): NoExpressao => ({
  tipo: "Literal",
  tipoDado: "STRING",
  valor,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const bool = (valor: string, tipoInferido?: TipoSemantico): NoExpressao => ({
  tipo: "Literal",
  tipoDado: "BOOLEAN",
  valor,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const nulo = (): NoExpressao => ({
  tipo: "Literal",
  tipoDado: "NULL",
  valor: "null",
  linha: l,
  coluna: c,
  tipoInferido: "null",
});

const undef = (): NoExpressao => ({
  tipo: "Literal",
  tipoDado: "UNDEFINED",
  valor: "undefined",
  linha: l,
  coluna: c,
  tipoInferido: "undefined",
});

const id = (nome: string, tipoInferido?: TipoSemantico): NoExpressao => ({
  tipo: "Identificador",
  nome,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const bin = (
  operador: string,
  esquerda: NoExpressao,
  direita: NoExpressao,
  tipoInferido?: TipoSemantico
): NoExpressao => ({
  tipo: "ExpressaoBinaria",
  operador,
  esquerda,
  direita,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const membro = (objeto: NoExpressao, propriedade: string): NoExpressao => ({
  tipo: "AcessoMembro",
  objeto,
  propriedade,
  linha: l,
  coluna: c,
});

const chamada = (callee: NoExpressao, argumentos: NoExpressao[] = []): NoExpressao => ({
  tipo: "ChamadaFuncao",
  callee,
  argumentos,
  linha: l,
  coluna: c,
});

const decl = (
  modificador: "let" | "const" | "var",
  nome: string,
  valorInicial: NoExpressao,
  tipoInferido?: TipoSemantico
): NoStatement => ({
  tipo: "DeclaracaoVariavel",
  modificador,
  nome,
  valorInicial,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

const expr = (expressao: NoExpressao): NoStatement => ({
  tipo: "ExpressaoStatement",
  expressao,
  linha: l,
  coluna: c,
});

const bloco = (corpo: NoStatement[]): NoBloco => ({
  tipo: "Bloco",
  corpo,
  linha: l,
  coluna: c,
});

const funcao = (
  nome: string,
  parametros: string[],
  corpo: NoStatement[]
): NoStatement => ({
  tipo: "DeclaracaoFuncao",
  nome,
  parametros: parametros.map((param) => ({
    tipo: "Parametro",
    nome: param,
    linha: l,
    coluna: c,
  })),
  corpo: bloco(corpo),
  linha: l,
  coluna: c,
});

const retorno = (
  argumento: NoExpressao | null,
  tipoInferido?: TipoSemantico
): NoStatement => ({
  tipo: "ReturnStatement",
  argumento,
  linha: l,
  coluna: c,
  ...(tipoInferido ? { tipoInferido } : {}),
});

function gerarDoCodigo(codigo: string): string {
  const client = cliente();
  new LexAnalyzer(client).run({ input: codigo });

  const sintatico = new SyntacticAnalyzer(client);
  expect(sintatico.run()).toBe(true);

  const semantico = new SemanticalAnalyzer(client);
  expect(semantico.run()).toBe(true);

  const gerador = new GoGenerator(client);
  expect(gerador.run()).toBe(true);

  return client.codigoGerado!;
}

describe("GoGenerator - estrutura base e imports", () => {
  test("AST vazia gera package main e func main vazios sem imports", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([]);

    expect(codigo).toBe("package main\n\nfunc main() {\n}");
  });

  test("console.log traduz para fmt.Println e inclui import \"fmt\" uma única vez", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      expr(chamada(membro(id("console"), "log"), [str("oi"), num("1")])),
      expr(chamada(membro(id("console"), "log"), [bool("true")])),
    ]);

    expect(codigo).toBe(
      [
        "package main",
        "",
        'import "fmt"',
        "",
        "func main() {",
        '\tfmt.Println("oi", 1)',
        "\tfmt.Println(true)",
        "}",
      ].join("\n")
    );
  });

  test("chamadas consecutivas a gerar() não vazam imports anteriores", () => {
    const gerador = new GoGenerator(cliente());

    const primeiro = gerador.gerar([
      expr(chamada(membro(id("console"), "log"), [str("com import")])),
    ]);
    const segundo = gerador.gerar([decl("let", "x", num("1", "number"), "number")]);

    expect(primeiro).toContain('import "fmt"');
    expect(segundo).not.toContain('import "fmt"');
    expect(segundo).toBe("package main\n\nfunc main() {\n\tvar x float64 = 1\n}");
  });
});

describe("GoGenerator - variáveis, constantes e literais", () => {
  test("traduz let e var para var com tipos float64, string e bool", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "idade", num("25", "number"), "number"),
      decl("var", "nome", str("Ana", "string"), "string"),
      decl("let", "ativo", bool("true", "boolean"), "boolean"),
    ]);

    expect(codigo).toContain("\tvar idade float64 = 25");
    expect(codigo).toContain('\tvar nome string = "Ana"');
    expect(codigo).toContain("\tvar ativo bool = true");
  });

  test("traduz null e undefined para any = nil", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "vazio", nulo(), "null"),
      decl("let", "indef", undef(), "undefined"),
    ]);

    expect(codigo).toContain("\tvar vazio any = nil");
    expect(codigo).toContain("\tvar indef any = nil");
  });

  test("traduz const primitiva para const e const null/undefined/any para var any", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("const", "pi", num("3.14", "number"), "number"),
      decl("const", "msg", str("ok", "string"), "string"),
      decl("const", "flag", bool("false", "boolean"), "boolean"),
      decl("const", "nada", nulo(), "null"),
      decl("const", "semValor", undef(), "undefined"),
      decl("const", "dinamico", id("outro"), "any"),
    ]);

    expect(codigo).toContain("\tconst pi = 3.14");
    expect(codigo).toContain('\tconst msg = "ok"');
    expect(codigo).toContain("\tconst flag = false");
    expect(codigo).toContain("\tvar nada any = nil");
    expect(codigo).toContain("\tvar semValor any = nil");
    expect(codigo).toContain("\tvar dinamico any = outro");
  });

  test("infere tipos de literais mesmo sem tipoInferido anotado na AST", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "n", num("42")),
      decl("let", "s", str("texto")),
      decl("let", "b", bool("false")),
    ]);

    expect(codigo).toContain("\tvar n float64 = 42");
    expect(codigo).toContain('\tvar s string = "texto"');
    expect(codigo).toContain("\tvar b bool = false");
  });

  test("escapa caracteres especiais em literais string", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("const", "texto", str('a\\b "c"\n\t\r', "string"), "string"),
    ]);

    expect(codigo).toContain('\tconst texto = "a\\\\b \\"c\\"\\n\\t\\r"');
  });
});

describe("GoGenerator - expressões binárias e precedência", () => {
  test("emite operadores aritméticos, relacionais, lógicos e de atribuição", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      expr(bin("=", id("x"), bin("+", id("a"), num("1")))),
      expr(bin("+=", id("x"), num("2"))),
      expr(bin("-=", id("x"), num("1"))),
      expr(bin("&&", bin(">", id("x"), num("0")), bin("!=", id("y"), num("3")))),
    ]);

    expect(codigo).toContain("\tx = a + 1");
    expect(codigo).toContain("\tx += 2");
    expect(codigo).toContain("\tx -= 1");
    expect(codigo).toContain("\tx > 0 && y != 3");
  });

  test("não adiciona parênteses desnecessários quando precedência natural já é maior", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "res", bin("+", num("2"), bin("*", num("3"), num("4"))), "number"),
    ]);

    expect(codigo).toContain("\tvar res float64 = 2 + 3 * 4");
  });

  test("preserva parênteses quando subexpressão tem precedência menor", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "res", bin("*", bin("+", num("2"), num("3")), num("4")), "number"),
    ]);

    expect(codigo).toContain("\tvar res float64 = (2 + 3) * 4");
  });

  test("preserva parênteses à direita em operadores não associativos (-, /, %)", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "sub", bin("-", num("10"), bin("-", num("3"), num("1"))), "number"),
      decl("let", "div", bin("/", num("12"), bin("/", num("6"), num("2"))), "number"),
      decl("let", "mod", bin("%", num("10"), bin("%", num("7"), num("4"))), "number"),
    ]);

    expect(codigo).toContain("\tvar sub float64 = 10 - (3 - 1)");
    expect(codigo).toContain("\tvar div float64 = 12 / (6 / 2)");
    expect(codigo).toContain("\tvar mod float64 = 10 % (7 % 4)");
  });
});

describe("GoGenerator - funções, retornos e chamadas", () => {
  test("eleva funções para o topo do pacote com parâmetros tipados pelas chamadas", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "resultado", chamada(id("soma"), [num("1"), num("2")]), "any"),
      funcao("soma", ["a", "b"], [retorno(bin("+", id("a"), id("b")), "any")]),
    ]);

    const idxFunc = codigo.indexOf("func soma(a float64, b float64) float64");
    const idxMain = codigo.indexOf("func main()");

    expect(idxFunc).toBeGreaterThan(-1);
    expect(idxFunc).toBeLessThan(idxMain);
    expect(codigo).toContain("\tvar resultado float64 = soma(1, 2)");
  });

  test("infere tipo de retorno float64, string, bool, any e vazio (void)", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      funcao("retNum", [], [retorno(num("10", "number"), "number")]),
      funcao("retStr", [], [retorno(str("ok", "string"), "string")]),
      funcao("retBool", [], [retorno(bool("true", "boolean"), "boolean")]),
      funcao("retMisto", [], [retorno(num("1", "number"), "number"), retorno(str("a", "string"), "string")]),
      funcao("retVazio", [], [retorno(null, "void")]),
      funcao("semRetorno", [], [expr(chamada(membro(id("console"), "log"), [str("oi")]))]),
    ]);

    expect(codigo).toContain("func retNum() float64 {");
    expect(codigo).toContain("func retStr() string {");
    expect(codigo).toContain("func retBool() bool {");
    expect(codigo).toContain("func retMisto() any {");
    expect(codigo).toContain("func retVazio() {\n\treturn\n}");
    expect(codigo).toContain('func semRetorno() {\n\tfmt.Println("oi")\n}');
  });

  test("traduz acesso a membro genérico e chamada de função do usuário", () => {
    const gerador = new GoGenerator(cliente());
    const codigo = gerador.gerar([
      decl("let", "pi", membro(id("Math"), "PI"), "any"),
      expr(chamada(id("minhaFunc"), [id("pi"), num("2")])),
    ]);

    expect(codigo).toContain("\tvar pi any = Math.PI");
    expect(codigo).toContain("\tminhaFunc(pi, 2)");
  });

  test("lança erro ao encontrar declaração de função aninhada", () => {
    const gerador = new GoGenerator(cliente());

    expect(() =>
      gerador.gerar([
        funcao("externa", [], [funcao("interna", [], [])]),
      ])
    ).toThrow(/Declaração de função aninhada 'interna' não suportada/);
  });
});

describe("GoGenerator - run() e pipeline completo", () => {
  test("run() retorna false e registra erro quando client.ast está ausente", () => {
    const erros: string[] = [];
    const client = cliente((msg) => erros.push(msg));
    const gerador = new GoGenerator(client);

    expect(gerador.run()).toBe(false);
    expect(erros.length).toBe(1);
    expect(erros[0]).toMatch(/AST ausente/);
  });

  test("run() retorna false e registra erro quando encontra comando ainda não suportado", () => {
    const erros: string[] = [];
    const client = cliente((msg) => erros.push(msg));
    client.ast = [
      {
        tipo: "BreakStatement",
        linha: 3,
        coluna: 1,
      },
    ];

    const gerador = new GoGenerator(client);

    expect(gerador.run()).toBe(false);
    expect(erros.length).toBe(1);
    expect(erros[0]).toMatch(/Comando 'BreakStatement' ainda não implementado/);
  });

  test("pipeline completo (Lex -> Syntactic -> Semantical -> GoGenerator) gera código Go válido", () => {
    const codigoGo = gerarDoCodigo(`
      let x = 10 + 20 * 2;
      const saudacao = "ola";
      let vazio = null;

      function soma(a, b) {
        return a + b;
      }

      x = soma(1, 2);
      console.log(saudacao, x, vazio);
    `);

    expect(codigoGo).toBe(
      [
        "package main",
        "",
        'import "fmt"',
        "",
        "func soma(a float64, b float64) float64 {",
        "\treturn a + b",
        "}",
        "",
        "func main() {",
        "\tvar x float64 = 10 + 20 * 2",
        '\tconst saudacao = "ola"',
        "\tvar vazio any = nil",
        "\tx = soma(1, 2)",
        "\tfmt.Println(saudacao, x, vazio)",
        "}",
      ].join("\n")
    );
  });
});
