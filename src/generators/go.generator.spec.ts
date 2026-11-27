import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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


const temGo = Bun.which("go") !== null;

/**
 * Compila o código Go gerado e, opcionalmente, executa-o. Se o Go não compilar, o teste falha
 * mostrando o erro do compilador e o código gerado.
 */
function compilarGo(codigoGo: string, executar: boolean): string {
  const pasta = mkdtempSync(path.join(tmpdir(), "go-gerado-"));
  try {
    writeFileSync(path.join(pasta, "main.go"), codigoGo);
    const comando = executar ? ["go", "run", "main.go"] : ["go", "build", "-o", path.join(pasta, "saida"), "main.go"];
    const resultado = Bun.spawnSync(comando, { cwd: pasta });

    if (resultado.exitCode !== 0) {
      throw new Error(`O Go não compilou o código gerado:\n${resultado.stderr.toString()}\n${codigoGo}`);
    }
    return resultado.stdout.toString();
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

describe("GoGenerator - tipos das funções", () => {
  test("deduz os tipos dos parâmetros e do retorno a partir das chamadas", () => {
    const codigo = gerarDoCodigo(`
      function soma(a, b) { return a + b; }
      console.log(soma(1, 2));
    `);

    expect(codigo).toContain("func soma(a float64, b float64) float64 {\n\treturn a + b\n}");
  });

  test("aceita múltiplos parâmetros de tipos diferentes", () => {
    const codigo = gerarDoCodigo(`
      function repetir(texto, vezes) { return texto; }
      console.log(repetir("oi", 3));
    `);

    expect(codigo).toContain("func repetir(texto string, vezes float64) string {");
  });

  test("propaga tipos entre funções que chamam outras funções", () => {
    const codigo = gerarDoCodigo(`
      function soma(a, b) { return a + b; }
      function dobroDaSoma(x, y) { return soma(x, y) * 2; }
      console.log(dobroDaSoma(1, 2));
    `);

    expect(codigo).toContain("func soma(a float64, b float64) float64 {");
    expect(codigo).toContain("func dobroDaSoma(x float64, y float64) float64 {");
  });

  test("usa o retorno deduzido da função ao tipar a variável que recebe o resultado", () => {
    const codigo = gerarDoCodigo(`
      function nome() { return "ana"; }
      let n = nome();
      console.log(n);
    `);

    expect(codigo).toContain("var n string = nome()");
  });

  test("deduz retorno booleano de comparações", () => {
    const codigo = gerarDoCodigo(`
      function maior(a, b) { return a > b; }
      console.log(maior(2, 1));
    `);

    expect(codigo).toContain("func maior(a float64, b float64) bool {");
  });

  test("mantém any quando nenhuma chamada permite descobrir o tipo do parâmetro", () => {
    const codigo = gerarDoCodigo(`
      function mostrar(x) { console.log(x); }
    `);

    expect(codigo).toContain("func mostrar(x any) {");
  });

  test("usa any no retorno quando os return da função discordam de tipo", () => {
    const codigo = gerarDoCodigo(`
      function f() { return 1; return "a"; }
      console.log(f());
    `);

    expect(codigo).toContain("func f() any {");
  });
});

describe("GoGenerator - return", () => {
  test("return vazio em função sem valor continua sendo apenas return", () => {
    const codigo = gerarDoCodigo(`
      function parar() { console.log("a"); return; }
      parar();
    `);

    expect(codigo).toContain('func parar() {\n\tfmt.Println("a")\n\treturn\n}');
  });

  test("return vazio em função que também retorna valor devolve o valor zero do tipo", () => {
    const codigo = gerarDoCodigo(`
      function f(x) { return x; return; }
      console.log(f(1));
    `);

    expect(codigo).toContain("func f(x float64) float64 {\n\treturn x\n\treturn 0\n}");
  });

  test("completa com o valor zero quando a função com retorno não termina em return", () => {
    const codigo = gerarDoCodigo(`
      function f(x) { return x; console.log(x); }
      console.log(f(1));
    `);

    expect(codigo).toContain("\tfmt.Println(x)\n\treturn 0\n}");
  });
});

describe("GoGenerator - console.log", () => {
  test("importa fmt quando console.log aparece apenas dentro de uma função", () => {
    const codigo = gerarDoCodigo(`
      function ola() { console.log("oi"); }
      ola();
    `);

    expect(codigo).toContain('import "fmt"');
    expect(codigo).toContain('func ola() {\n\tfmt.Println("oi")\n}');
  });

  test("não importa fmt quando console.log não é usado", () => {
    const codigo = gerarDoCodigo(`
      function dobro(x) { return x * 2; }
      let r = dobro(2);
    `);

    expect(codigo).not.toContain("fmt");
  });
});

describe("GoGenerator - o Go gerado compila", () => {
  test.skipIf(!temGo)("recursão simples e múltiplos parâmetros compilam com os tipos deduzidos", () => {
    const codigo = gerarDoCodigo(`
      function fatorial(n) { return n * fatorial(n - 1); }
      function potencia(base, expoente) { return base * potencia(base, expoente - 1); }
      console.log(fatorial(5), potencia(2, 10));
    `);

    expect(codigo).toContain("func fatorial(n float64) float64 {");
    expect(codigo).toContain("func potencia(base float64, expoente float64) float64 {");
    compilarGo(codigo, false);
  }, 60_000);

  test.skipIf(!temGo)("funções, return e console.log executam com a mesma saída do JavaScript", () => {
    const codigo = gerarDoCodigo(`
      function soma(a, b) { return a + b; }
      function media(a, b) { return (a + b) / 2; }
      function dobroDaSoma(x, y) { return soma(x, y) * 2; }
      function saudar(nome) {
        console.log("Olá,", nome);
        return;
      }
      function ehMaior(a, b) { return a > b; }

      let r = soma(2, 3);
      saudar("mundo");
      console.log(r, media(1, 2), dobroDaSoma(1, 2));
      console.log(ehMaior(3, 2), ehMaior(1, 2));
    `);

    expect(compilarGo(codigo, true)).toBe("Olá, mundo\n5 1.5 6\ntrue false\n");
  }, 60_000);
});