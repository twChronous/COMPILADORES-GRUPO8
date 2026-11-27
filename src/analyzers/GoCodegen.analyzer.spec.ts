import { describe, expect, test } from "bun:test";
import GoCodegenAnalyzer from "./GoCodegen.analyzer";
import LexAnalyzer from "./Lexycal.analyzer";
import SyntacticAnalyzer from "./Syntactic.analyzer";
import SemanticalAnalyzer from "./Semantical.analyzer";
import type { ClientInterface, NoExpressao, NoStatement } from "../utils/types";

const l = 1;
const c = 1;

function clienteBase(): ClientInterface {
  return {
    tokens: [],
    analyzers: [],
    LOG() {},
    LOG_ERR() {},
    LOG_WARN() {},
    Error() {},
  };
}

function compilarJsParaGo(input: string): string {
  const client = clienteBase();
  new LexAnalyzer(client).run({ input });
  new SyntacticAnalyzer(client).run();
  new SemanticalAnalyzer(client).run();
  const codegen = new GoCodegenAnalyzer(client);
  expect(codegen.run()).toBe(true);
  return client.codigoGo ?? "";
}

function codegenDireto(statements: NoStatement[]): GoCodegenAnalyzer {
  const client = clienteBase();
  client.ast = statements;
  const gen = new GoCodegenAnalyzer(client);
  gen.run();
  return gen;
}

const num = (valor: string, tipoInferido: "number" = "number") => ({
  tipo: "Literal" as const,
  tipoDado: "NUMERO" as const,
  valor,
  tipoInferido,
  linha: l,
  coluna: c,
});

const str = (valor: string) => ({
  tipo: "Literal" as const,
  tipoDado: "STRING" as const,
  valor,
  tipoInferido: "string" as const,
  linha: l,
  coluna: c,
});

const bool = (valor: string) => ({
  tipo: "Literal" as const,
  tipoDado: "BOOLEAN" as const,
  valor,
  tipoInferido: "boolean" as const,
  linha: l,
  coluna: c,
});

const nulo = () => ({
  tipo: "Literal" as const,
  tipoDado: "NULL" as const,
  valor: "null",
  tipoInferido: "null" as const,
  linha: l,
  coluna: c,
});

const decl = (
  modificador: "let" | "const" | "var",
  nome: string,
  valorInicial: NoExpressao,
  tipoInferido: "number" | "string" | "boolean" | "null" = "number",
): NoStatement => ({
  tipo: "DeclaracaoVariavel",
  modificador,
  nome,
  valorInicial,
  tipoInferido,
  linha: l,
  coluna: c,
});

describe("GoCodegenAnalyzer", () => {
  test("integração: declarações let/const/var", () => {
    const saida = compilarJsParaGo("let x = 10; const y = 20; var z = 30;");
    expect(saida).toBe(
      [
        "var x float64 = 10",
        "const y float64 = 20",
        "var z float64 = 30",
      ].join("\n"),
    );
  });

  test("integração: atribuições =, += e -=", () => {
    const saida = compilarJsParaGo("let n = 0; n = 5; n += 2; n -= 1;");
    expect(saida).toBe(
      [
        "var n float64 = 0",
        "n = 5",
        "n += 2",
        "n -= 1",
      ].join("\n"),
    );
  });

  test("integração: expressões aritméticas e precedência", () => {
    const saida = compilarJsParaGo("let r = 0; r = 2 + 3 * 4;");
    expect(saida).toBe(["var r float64 = 0", "r = 2 + 3 * 4"].join("\n"));

    const comParenteses = compilarJsParaGo("let s = 0; s = (2 + 3) * 4;");
    expect(comParenteses).toBe(["var s float64 = 0", "s = (2 + 3) * 4"].join("\n"));
  });

  test("integração: operadores relacionais, igualdade e lógicos", () => {
    const saida = compilarJsParaGo(
      'let ok = false; ok = 1 < 2 && 3 == 3 || false;',
    );
    expect(saida).toBe(
      [
        "var ok bool = false",
        "ok = 1 < 2 && 3 == 3 || false",
      ].join("\n"),
    );
  });

  test("literais: string, boolean e null", () => {
    const gen = codegenDireto([
      decl("let", "s", str("ola"), "string"),
      decl("const", "b", bool("true"), "boolean"),
      decl("var", "v", nulo(), "null"),
    ]);
    expect(gen.client.codigoGo).toBe(
      [
        'var s string = "ola"',
        "const b bool = true",
        "var v interface{} = nil",
      ].join("\n"),
    );
  });

  test("gerarExpressao com undefined usa valor zero do contexto", () => {
    const gen = codegenDireto([decl("let", "x", num("1"))]);
    expect(gen.gerarExpressao(
      { tipo: "Literal", tipoDado: "UNDEFINED", valor: "undefined", linha: l, coluna: c },
      "number",
    )).toBe("0");
    expect(gen.gerarExpressao(
      { tipo: "Literal", tipoDado: "UNDEFINED", valor: "undefined", linha: l, coluna: c },
      "string",
    )).toBe('""');
  });

  test("rejeita construções fora do escopo da issue #67", () => {
    const gen = new GoCodegenAnalyzer(clienteBase());
    const ifStmt: NoStatement = {
      tipo: "DeclaracaoIf",
      condicao: num("1"),
      consequencia: { tipo: "Bloco", corpo: [], linha: l, coluna: c },
      alternativa: null,
      linha: l,
      coluna: c,
    };
    expect(() => gen.gerarStatement(ifStmt)).toThrow(/não implementado nesta etapa/);
  });

  test("snapshot: fragmento mínimo", () => {
    const saida = compilarJsParaGo("const soma = 1 + 2;");
    expect(saida).toMatchSnapshot();
  });
});