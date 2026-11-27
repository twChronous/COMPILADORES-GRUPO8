import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dir, "..");

function executarCLI(...args: string[]) {
  const resultado = Bun.spawnSync({
    cmd: [
      process.execPath,
      "run",
      "src/index.ts",
      ...args,
    ],
    cwd: raiz,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: resultado.exitCode,
    stdout: resultado.stdout.toString(),
    stderr: resultado.stderr.toString(),
  };
}

function comPastaTemporaria(
  executar: (pasta: string) => void
) {
  const pasta = mkdtempSync(
    join(tmpdir(), "compilador-cli-")
  );

  try {
    executar(pasta);
  } finally {
    rmSync(pasta, {
      recursive: true,
      force: true,
    });
  }
}

describe("CLI - geracao de arquivo Go (#71)", () => {
  test("documenta a flag --output no help", () => {
    const resultado = executarCLI("--help");

    expect(resultado.exitCode).toBe(0);
    expect(resultado.stdout).toContain("--output");
  });

  test("gera arquivo Go utilizando --output", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "entrada.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(
        entrada,
        "console.log(10 + 20);"
      );

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(0);
      expect(existsSync(saida)).toBe(true);

      const codigoGo = readFileSync(saida, "utf-8");

      expect(codigoGo).toContain("package main");
      expect(codigoGo).toContain('import "fmt"');
      expect(codigoGo).toContain("fmt.Println(10 + 20)");
    });
  });

  test("aceita --output antes do arquivo fonte", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "entrada.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(entrada, 'console.log("teste");');

      const resultado = executarCLI(
        "--output",
        saida,
        entrada
      );

      expect(resultado.exitCode).toBe(0);
      expect(existsSync(saida)).toBe(true);
    });
  });

  test("aceita --output com sinal de igual", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "entrada.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(entrada, "console.log(10);");

      const resultado = executarCLI(
        entrada,
        `--output=${saida}`
      );

      expect(resultado.exitCode).toBe(0);
      expect(existsSync(saida)).toBe(true);
    });
  });

  for (const flag of ["--out", "-o"]) {
    test(`preserva compatibilidade com ${flag}`, () => {
      comPastaTemporaria(pasta => {
        const entrada = join(pasta, "entrada.js");
        const saida = join(pasta, "saida.go");

        writeFileSync(entrada, "console.log(20);");

        const resultado = executarCLI(
          entrada,
          flag,
          saida
        );

        expect(resultado.exitCode).toBe(0);
        expect(existsSync(saida)).toBe(true);
      });
    });
  }

  test("rejeita --output sem argumento", () => {
    const resultado = executarCLI("--output");

    expect(resultado.exitCode).toBe(1);
    expect(resultado.stderr).toContain(
      "exige um arquivo de saída"
    );
  });

  test("rejeita --output com argumento vazio", () => {
    const resultado = executarCLI("--output=");

    expect(resultado.exitCode).toBe(1);
    expect(resultado.stderr).toContain(
      "exige um arquivo de saída"
    );
  });

  test("nao gera saida para fonte inexistente", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "inexistente.js");
      const saida = join(pasta, "saida.go");

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(1);
      expect(existsSync(saida)).toBe(false);
      expect(resultado.stderr).toContain(
        "Falha ao ler o arquivo"
      );
    });
  });

  test("nao gera arquivo em caso de erro sintatico", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "invalido.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(entrada, "let x = (1 + 2;");

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(1);
      expect(existsSync(saida)).toBe(false);
      expect(resultado.stderr).toContain(
        "Falha na compilação"
      );
    });
  });

  test("nao gera arquivo em caso de erro semantico", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "invalido.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(
        entrada,
        'let x = 1; x = "texto";'
      );

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(1);
      expect(existsSync(saida)).toBe(false);
      expect(resultado.stderr).toContain(
        "Falha na compilação"
      );
    });
  });

  test("preserva arquivo existente se a compilacao falhar", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "invalido.js");
      const saida = join(pasta, "saida.go");

      writeFileSync(entrada, "let x = (1 + 2;");
      writeFileSync(saida, "conteudo anterior");

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(1);
      expect(readFileSync(saida, "utf-8")).toBe(
        "conteudo anterior"
      );
    });
  });

  test("informa erro quando nao consegue gravar a saida", () => {
    comPastaTemporaria(pasta => {
      const entrada = join(pasta, "entrada.js");
      const saida = join(
        pasta,
        "pasta-inexistente",
        "saida.go"
      );

      writeFileSync(entrada, "console.log(10);");

      const resultado = executarCLI(
        entrada,
        "--output",
        saida
      );

      expect(resultado.exitCode).toBe(1);
      expect(resultado.stderr).toContain(
        "Falha ao gravar o arquivo"
      );
    });
  });
});
