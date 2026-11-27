import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import Compiler from "./Compiler";

export interface CliOptions {
  help: boolean;
  verbose: boolean;
  showAst: boolean;
  showTokens: boolean;
  showTS: boolean;
  showGo: boolean;
  saveJson: boolean;
  arquivoJson?: string;
  arquivoSaida?: string;
  arquivoFonte?: string;
}

const FLAGS_SAIDA_GO = new Set(["-o", "--out", "--output"]);
const PREFIXOS_SAIDA_GO = ["-o=", "--out=", "--output="];

/**
 * Interpreta os argumentos de linha de comando da CLI.
 */
export function parseCliArgs(listaArgs: string[]): CliOptions {
  const indicesConsumidos = new Set<number>();
  const flagsSaida = ["--output", "--out", "-o"];

  let arquivoSaida: string | undefined;
  let arquivoJson: string | undefined;
  let saveJson = false;

  for (let i = 0; i < listaArgs.length; i++) {
    const arg = listaArgs[i];

    if (FLAGS_SAIDA_GO.has(arg)) {
      indicesConsumidos.add(i);
      if (i + 1 < listaArgs.length && !listaArgs[i + 1].startsWith("-")) {
        arquivoSaida = listaArgs[i + 1];
        indicesConsumidos.add(i + 1);
      }
      continue;
    }

    const prefixoSaida = PREFIXOS_SAIDA_GO.find((p) => arg.startsWith(p));
    if (prefixoSaida) {
      const valor = arg.slice(prefixoSaida.length);
      if (valor) arquivoSaida = valor;
      indicesConsumidos.add(i);
      continue;
    }

    if (arg.startsWith("--json=")) {
      saveJson = true;
      arquivoJson = arg.slice("--json=".length) || "output.json";
      indicesConsumidos.add(i);
      continue;
    }

    if (arg === "--json") {
      saveJson = true;
      indicesConsumidos.add(i);
      if (
        i + 1 < listaArgs.length &&
        !listaArgs[i + 1].startsWith("-") &&
        /\.json$/i.test(listaArgs[i + 1])
      ) {
        arquivoJson = listaArgs[i + 1];
        indicesConsumidos.add(i + 1);
      }
    }
  }

  let arquivoFonte: string | undefined;

  for (let i = 0; i < listaArgs.length; i++) {
    const arg = listaArgs[i];
    if (arg.startsWith("-") || indicesConsumidos.has(i)) continue;

    if (/\.go$/i.test(arg)) {
      if (!arquivoSaida) arquivoSaida = arg;
      indicesConsumidos.add(i);
      continue;
    }

    if (saveJson && !arquivoJson && /\.json$/i.test(arg)) {
      arquivoJson = arg;
      indicesConsumidos.add(i);
      continue;
    }

    if (!arquivoFonte) {
      arquivoFonte = arg;
    }
  }

  if (saveJson && !arquivoJson) {
    arquivoJson = "output.json";
  }

  return {
    help: listaArgs.includes("--help") || listaArgs.includes("-h"),
    verbose: listaArgs.includes("--verbose"),
    showAst: listaArgs.includes("--ast"),
    showTokens: listaArgs.includes("--tokens"),
    showTS: listaArgs.includes("--ts"),
    showGo: listaArgs.includes("--go"),
    saveJson,
    arquivoJson,
    arquivoSaida,
    arquivoFonte,
  };
}

function salvarArquivo(caminho: string, conteudo: string): void {
  const dir = dirname(caminho);
  if (dir && dir !== ".") {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(caminho, conteudo, "utf-8");
}

function exibirAjuda(): void {
  console.log(`
Uso: bun start [arquivo.js] [saida.go] [opcoes]

Opções:
  -h, --help                   Exibe esta tela de ajuda e encerra a execução.
  --verbose                    Ativa logs detalhados do processo de compilacao (Lexer, Parser, etc).
  --ast                        Imprime a Arvore Sintatica Abstrata (AST) final no terminal.
  --tokens                     Imprime a entrada em tokens final no terminal.
  --ts                         Imprime a tabela de simbolos no terminal.
  --go                         Imprime o codigo Go gerado no terminal.
  -o, --out, --output <arq>    Salva o codigo Go gerado no arquivo especificado (ou passe <saida>.go diretamente).
  --json [arquivo.json]        Salva o output da compilação em formato JSON (padrão: output.json).

Exemplos de uso:
  bun start teste.js
  bun start teste.js saida.go
  bun start teste.js --output saida.go
  bun start teste.js --go
  bun start teste.js --tokens
  bun start teste.js --ts
  bun start teste.js --json
  bun start teste.js --ast --json saida.json
  bun start teste.js --ast --verbose
  `);
}

/**
 * Executa a CLI do compilador com os argumentos fornecidos.
 */
export async function run(listaArgs: string[] = process.argv.slice(2)): Promise<number> {
  const {
    help,
    verbose,
    showAst,
    showTokens,
    showTS,
    showGo,
    saveJson,
    arquivoJson,
    arquivoSaida,
    arquivoFonte,
  } = parseCliArgs(listaArgs);

  if (help) {
    exibirAjuda();
    return 0;
  }

  const compiler = new Compiler({ verbose, showAst, showTokens, showGo });
  let input = "";

  if (arquivoFonte) {
    try {
      input = readFileSync(arquivoFonte, "utf-8");
    } catch (err: any) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Falha ao ler o arquivo '${arquivoFonte}': ${err.message}`);
      return 1;
    }
  } else {
    if (verbose) {
      console.log(
        "\x1b[33m[INFO]\x1b[0m Nenhum arquivo .js detectado. Utilizando o bloco de código interno (fallback)."
      );
    }

    input = `
      let x = 10 + 20;

      if (x > 10) {
        x = x + 1;
      }

      console.log("test")

      function soma(a,b) {
        return a + b;
      }

      x = soma(1,2)
      let j = null
      let y = null

      while(j != y) {
        break;
      }
    `;
  }

  const sucesso = await compiler.compile(input);
  const tabelaFiltrada = compiler.tabelaSimbolos?.filter(
    (simbolo) => simbolo.linhaDeclaracao > 0
  );

  if (saveJson && arquivoJson) {
    const temFiltroSaida = showAst || showTokens || showTS || showGo;
    const payloadJson = temFiltroSaida
      ? {
          ...(showTokens ? { tokens: compiler.tokens } : {}),
          ...(showAst ? { ast: compiler.ast ?? null } : {}),
          ...(showTS ? { tabelaSimbolos: tabelaFiltrada ?? [] } : {}),
          ...(showGo ? { codigoGerado: compiler.codigoGerado ?? null } : {}),
        }
      : {
          sucesso,
          tokens: compiler.tokens,
          ast: compiler.ast ?? null,
          tabelaSimbolos: tabelaFiltrada ?? [],
          codigoGerado: compiler.codigoGerado ?? null,
          ...(compiler.errosSintaticos && compiler.errosSintaticos.length > 0
            ? { errosSintaticos: compiler.errosSintaticos }
            : {}),
        };

    salvarArquivo(arquivoJson, JSON.stringify(payloadJson, null, 2));
    console.log(`\x1b[32m[INFO]\x1b[0m Output JSON salvo em '${arquivoJson}'.`);
  } else {
    if (showAst && compiler.ast) {
      console.log("\n\x1b[35m=== AST GERADA ===\x1b[0m");
      console.log(JSON.stringify(compiler.ast, null, 2));
    }

    if (showTokens && compiler.tokens) {
      console.log("\n\x1b[35m=== TOKENS ===\x1b[0m");
      console.log(JSON.stringify(compiler.tokens, null, 2));
    }

    if (showTS && tabelaFiltrada) {
      console.log("\n\x1b[35m=== TABELA DE SIMBOLOS ===\x1b[0m");
      console.log(JSON.stringify(tabelaFiltrada, null, 2));
    }

    if (sucesso && showGo && compiler.codigoGerado) {
      console.log("\n\x1b[35m=== CODIGO GO GERADO ===\x1b[0m");
      console.log(compiler.codigoGerado);
    }
  }

  if (sucesso && compiler.codigoGerado && arquivoSaida) {
    salvarArquivo(arquivoSaida, compiler.codigoGerado);
    console.log(`\x1b[32m[INFO]\x1b[0m Código Go salvo em '${arquivoSaida}'.`);
  }

  return sucesso ? 0 : 1;
}

if (import.meta.main) {
  run().then((code) => {
    if (code !== 0) process.exit(code);
  });
}
