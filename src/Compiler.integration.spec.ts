import { describe, expect, test } from "bun:test";
import Compiler from "./Compiler";

async function compilar(codigo: string) {
  const compiler = new Compiler();
  const sucesso = await compiler.compile(codigo);
  return { compiler, sucesso };
}

describe("Compiler — integração ponta a ponta (#73)", () => {
  test("compila declarações e gera package main com corpo tipado", async () => {
    const { sucesso, compiler } = await compilar(
      "let x = 10; const y = \"a\";",
    );
    expect(sucesso).toBe(true);
    expect(compiler.codigoGerado).toBe(
      [
        "package main",
        "",
        "func main() {",
        "\tvar x float64 = 10",
        '\tconst y = "a"',
        "}",
      ].join("\n"),
    );
    expect(compiler.tabelaSimbolos?.some((s) => s.nome === "x")).toBe(true);
  });

  test("compila atribuições e expressões no corpo main", async () => {
    const { sucesso, compiler } = await compilar(
      "let n = 0; n = 5; n += 2; n -= 1;",
    );
    expect(sucesso).toBe(true);
    expect(compiler.codigoGerado).toContain("var n float64 = 0");
    expect(compiler.codigoGerado).toContain("n = 5");
    expect(compiler.codigoGerado).toContain("n += 2");
    expect(compiler.codigoGerado).toContain("n -= 1");
  });

  test("compila console.log com import fmt", async () => {
    const { sucesso, compiler } = await compilar('console.log("oi", 1);');
    expect(sucesso).toBe(true);
    expect(compiler.codigoGerado).toContain('import "fmt"');
    expect(compiler.codigoGerado).toContain('fmt.Println("oi", 1)');
  });

  test("compila função de topo e chamada com inferência de tipos", async () => {
    const { sucesso, compiler } = await compilar(`
      function soma(a, b) { return a + b; }
      console.log(soma(1, 2));
    `);
    expect(sucesso).toBe(true);
    expect(compiler.codigoGerado).toContain(
      "func soma(a float64, b float64) float64",
    );
    expect(compiler.codigoGerado).toContain("fmt.Println(soma(1, 2))");
  });

  test("falha semântica não produz código Go", async () => {
    const { sucesso, compiler } = await compilar(
      'let x = 1; x = "texto";',
    );
    expect(sucesso).toBe(false);
    expect(compiler.codigoGerado).toBeUndefined();
  });

  test("falha sintática não produz código Go", async () => {
    const { sucesso, compiler } = await compilar("let x = (1 + 2;");
    expect(sucesso).toBe(false);
    expect(compiler.codigoGerado).toBeUndefined();
    expect(compiler.errosSintaticos?.length).toBeGreaterThan(0);
  });

  test("reutiliza loaders sem duplicar analisadores entre compilações", async () => {
    const compiler = new Compiler();
    const ok1 = await compiler.compile("let a = 1;");
    const qtdAnalisadores = compiler.analyzers.length;
    const ok2 = await compiler.compile("let b = 2;");
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(compiler.analyzers.length).toBe(qtdAnalisadores);
    expect(compiler.codigoGerado).toContain("var b float64 = 2");
  });
});