import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { parseCliArgs } from "./index";

const CAMINHO_INDEX = resolve(import.meta.dir, "index.ts");

function executarCli(args: string[], cwd: string) {
  return Bun.spawnSync({
    cmd: [process.execPath, "run", CAMINHO_INDEX, ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("CLI — parseCliArgs", () => {
  test("sem argumentos mantém todas as flags desativadas e caminhos indefinidos", () => {
    expect(parseCliArgs([])).toEqual({
      help: false,
      verbose: false,
      showAst: false,
      showTokens: false,
      showTS: false,
      showGo: false,
      saveJson: false,
      arquivoJson: undefined,
      arquivoSaida: undefined,
      arquivoFonte: undefined,
    });
  });

  test("interpreta entrada .js e saída .go posicionais", () => {
    const parsed = parseCliArgs(["entrada.js", "saida.go"]);
    expect(parsed.arquivoFonte).toBe("entrada.js");
    expect(parsed.arquivoSaida).toBe("saida.go");
  });

  test("interpreta apenas saída .go posicional sem arquivo fonte", () => {
    const parsed = parseCliArgs(["saida.go"]);
    expect(parsed.arquivoFonte).toBeUndefined();
    expect(parsed.arquivoSaida).toBe("saida.go");
  });

  test("suporta --output, --output=, --out e -o", () => {
    expect(parseCliArgs(["entrada.js", "--output", "out/app.go"]).arquivoSaida).toBe("out/app.go");
    expect(parseCliArgs(["entrada.js", "--output=out/app.go"]).arquivoSaida).toBe("out/app.go");
    expect(parseCliArgs(["entrada.js", "--out", "a.go"]).arquivoSaida).toBe("a.go");
    expect(parseCliArgs(["entrada.js", "-o", "a.go"]).arquivoSaida).toBe("a.go");
  });

  test("interpreta --json sem confundir arquivo .js como destino JSON", () => {
    const parsed = parseCliArgs(["--json", "entrada.js"]);
    expect(parsed.saveJson).toBe(true);
    expect(parsed.arquivoJson).toBe("output.json");
    expect(parsed.arquivoFonte).toBe("entrada.js");
  });

  test("interpreta --json com caminho explícito e --json=", () => {
    const comEspaco = parseCliArgs(["entrada.js", "--json", "res.json"]);
    expect(comEspaco.saveJson).toBe(true);
    expect(comEspaco.arquivoJson).toBe("res.json");
    expect(comEspaco.arquivoFonte).toBe("entrada.js");

    const comIgual = parseCliArgs(["entrada.js", "--json=res.json"]);
    expect(comIgual.saveJson).toBe(true);
    expect(comIgual.arquivoJson).toBe("res.json");
    expect(comIgual.arquivoFonte).toBe("entrada.js");
  });
});

describe("CLI — execução ponta a ponta", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "compilador-cli-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("sem flags não imprime nem gera nenhum arquivo (fallback)", () => {
    const res = executarCli([], tempDir);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.toString().trim()).toBe("");
    expect(res.stderr.toString().trim()).toBe("");
    expect(readdirSync(tempDir)).toEqual([]);
  });

  test("sem flags não imprime nem gera arquivo com entrada .js", () => {
    writeFileSync(join(tempDir, "entrada.js"), "let x = 1;", "utf-8");
    const res = executarCli(["entrada.js"], tempDir);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.toString().trim()).toBe("");
    expect(res.stderr.toString().trim()).toBe("");
    expect(readdirSync(tempDir)).toEqual(["entrada.js"]);
  });

  test("com --verbose sem --go não imprime código Go gerado", () => {
    const res = executarCli(["--verbose"], tempDir);
    const stdout = res.stdout.toString();
    expect(res.exitCode).toBe(0);
    expect(stdout).toContain("[COMPILER]");
    expect(stdout).not.toContain("=== CODIGO GO GERADO ===");
    expect(stdout).not.toContain("package main");
  });

  test("com --go imprime código Go gerado no terminal", () => {
    const res = executarCli(["--go"], tempDir);
    const stdout = res.stdout.toString();
    expect(res.exitCode).toBe(0);
    expect(stdout).toContain("=== CODIGO GO GERADO ===");
    expect(stdout).toContain("package main");
  });

  test("gera arquivo .go ao passar <SAIDA>.go posicional (com e sem arquivo fonte)", () => {
    writeFileSync(join(tempDir, "entrada.js"), "let a = 42;", "utf-8");
    const res1 = executarCli(["entrada.js", "sub/meu_codigo.go"], tempDir);
    expect(res1.exitCode).toBe(0);
    expect(res1.stdout.toString()).not.toContain("=== CODIGO GO GERADO ===");

    const caminho1 = join(tempDir, "sub/meu_codigo.go");
    expect(existsSync(caminho1)).toBe(true);
    const conteudo1 = readFileSync(caminho1, "utf-8");
    expect(conteudo1).toContain("package main");
    expect(conteudo1).toContain("var a float64 = 42");

    const res2 = executarCli(["apenas_saida.go"], tempDir);
    expect(res2.exitCode).toBe(0);
    expect(existsSync(join(tempDir, "apenas_saida.go"))).toBe(true);
    expect(readFileSync(join(tempDir, "apenas_saida.go"), "utf-8")).toContain("package main");
  });

  test("gera arquivo .go ao usar --output", () => {
    writeFileSync(join(tempDir, "entrada.js"), "const ok = true;", "utf-8");
    const res = executarCli(["entrada.js", "--output", "custom.go"], tempDir);
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(tempDir, "custom.go"))).toBe(true);
    expect(readFileSync(join(tempDir, "custom.go"), "utf-8")).toContain("const ok = true");
  });

  test("com --json salva output completo em output.json", () => {
    writeFileSync(join(tempDir, "entrada.js"), "let n = 10;", "utf-8");
    const res = executarCli(["entrada.js", "--json"], tempDir);
    expect(res.exitCode).toBe(0);

    const caminhoJson = join(tempDir, "output.json");
    expect(existsSync(caminhoJson)).toBe(true);
    const dados = JSON.parse(readFileSync(caminhoJson, "utf-8"));
    expect(dados.sucesso).toBe(true);
    expect(Array.isArray(dados.tokens)).toBe(true);
    expect(Array.isArray(dados.ast)).toBe(true);
    expect(Array.isArray(dados.tabelaSimbolos)).toBe(true);
    expect(dados.codigoGerado).toContain("var n float64 = 10");
  });

  test("com --ast --tokens --json relatorio.json filtra o JSON e não imprime no terminal", () => {
    writeFileSync(join(tempDir, "entrada.js"), "let n = 5;", "utf-8");
    const res = executarCli(["entrada.js", "--ast", "--tokens", "--json", "relatorio.json"], tempDir);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.toString()).not.toContain("=== AST GERADA ===");
    expect(res.stdout.toString()).not.toContain("=== TOKENS ===");

    const dados = JSON.parse(readFileSync(join(tempDir, "relatorio.json"), "utf-8"));
    expect(Array.isArray(dados.ast)).toBe(true);
    expect(Array.isArray(dados.tokens)).toBe(true);
    expect(dados.codigoGerado).toBeUndefined();
    expect(dados.tabelaSimbolos).toBeUndefined();
  });

  test("gera ambos <SAIDA>.go e <arquivo>.json quando combinados", () => {
    writeFileSync(join(tempDir, "entrada.js"), "let v = 7;", "utf-8");
    const res = executarCli(["entrada.js", "saida.go", "--json", "res.json"], tempDir);
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(tempDir, "saida.go"))).toBe(true);
    expect(existsSync(join(tempDir, "res.json"))).toBe(true);
  });

  test("erro semântico retorna exitCode 1 e não gera arquivo .go", () => {
    writeFileSync(join(tempDir, "erro.js"), 'let x = 1; x = "a";', "utf-8");
    const res = executarCli(["erro.js", "saida.go"], tempDir);
    expect(res.exitCode).toBe(1);
    expect(existsSync(join(tempDir, "saida.go"))).toBe(false);
  });
});
