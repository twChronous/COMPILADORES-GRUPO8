
import { readFileSync, writeFileSync } from "fs";
import Compiler from "./Compiler";

// Extrai os argumentos repassados via linha de comando
const args = process.argv.slice(2);

/**
 * Extrai o caminho do arquivo de saída e os argumentos consumidos.
 * Aceita --output, --out e -o.
 */
function extrairOpcoesSaida(listaArgs: string[]): {
  arquivoSaida?: string;
  indicesConsumidos: Set<number>;
  erro?: string;
} {
  const indicesConsumidos = new Set<number>();
  const flagsSaida = ["--output", "--out", "-o"];

  let arquivoSaida: string | undefined;

  for (let i = 0; i < listaArgs.length; i++) {
    const arg = listaArgs[i];

    if (flagsSaida.includes(arg)) {
      const proximo = listaArgs[i + 1];

      if (!proximo?.trim() || proximo.startsWith("-")) {
        return {
          indicesConsumidos,
          erro: `A flag ${arg} exige um arquivo de saída.`,
        };
      }

      arquivoSaida = proximo;
      indicesConsumidos.add(i);
      indicesConsumidos.add(i + 1);

      i++;
    } else {
      const flag = flagsSaida.find(
        f => arg.startsWith(`${f}=`)
      );

      if (flag) {
        arquivoSaida = arg.slice(flag.length + 1);
        indicesConsumidos.add(i);

        if (!arquivoSaida.trim()) {
          return {
            indicesConsumidos,
            erro: `A flag ${flag} exige um arquivo de saída.`,
          };
        }
      }
    }
  }

  return { arquivoSaida, indicesConsumidos };
}

// Mapeia as flags booleanas
const help = args.includes("--help") || args.includes("-h");
const verbose = args.includes("--verbose");
const showAst = args.includes("--ast");
const showTokens = args.includes("--tokens");
const showTS = args.includes("--ts");
const showGo = args.includes("--go");

const {
  arquivoSaida,
  indicesConsumidos,
  erro
} = extrairOpcoesSaida(args);

// Identifica o arquivo fonte sem confundir com o arquivo de saída
const arquivoFonte = args.find(
  (arg, indice) =>
    !arg.startsWith("-") && !indicesConsumidos.has(indice)
);

// Exibe a ajuda
if (help) {
  console.log(`
Uso: bun start [arquivo.js] [opcoes]

Opções:
  -h, --help             Exibe esta tela de ajuda.
  --verbose              Ativa logs detalhados da compilação.
  --ast                  Imprime a Árvore Sintática Abstrata.
  --tokens               Imprime os tokens.
  --ts                   Imprime a tabela de símbolos.
  --go                   Imprime o código Go gerado.
  --output <arquivo.go>  Salva o código Go no arquivo especificado.
  -o, --out <arquivo>    Apelidos para a opção --output.

Exemplos de uso:
  bun start teste.js
  bun start teste.js --verbose
  bun start teste.js --tokens
  bun start teste.js --ts
  bun start teste.js --go
  bun start teste.js --output saida.go
  bun start teste.js --out saida.go
  bun start teste.js -o saida.go
  bun start teste.js --ast --verbose
  bun start teste.js --tokens --ast --verbose
  `);

  process.exit(0);
}

async function run() {
  if (erro) {
    throw new Error(erro);
  }

  const compiler = new Compiler({
    verbose,
    showAst,
    showTokens,
    showGo
  });

  let input = "";

  if (arquivoFonte) {
    try {
      input = readFileSync(arquivoFonte, "utf-8");
    } catch (err) {
      throw new Error(
        `Falha ao ler o arquivo '${arquivoFonte}': ${err}`
      );
    }
  } else {
    // Preserva o modo de fallback para desenvolvimento
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

  // Executa o pipeline completo do compilador
  const sucesso = await compiler.compile(input);

  // Exibe a AST quando solicitado
  if (showAst && compiler.ast) {
    console.log("\n\x1b[35m=== AST GERADA ===\x1b[0m");
    console.log(JSON.stringify(compiler.ast, null, 2));
  }

  // Exibe os tokens quando solicitado
  if (showTokens && compiler.tokens) {
    console.log("\n\x1b[35m=== TOKENS ===\x1b[0m");
    console.log(JSON.stringify(compiler.tokens, null, 2));
  }

  // Exibe a tabela de símbolos quando solicitado
  if (showTS && compiler.tabelaSimbolos) {
    const tabelaFiltrada = compiler.tabelaSimbolos.filter(
      simbolo => simbolo.linhaDeclaracao > 0
    );

    console.log(
      "\n\x1b[35m=== TABELA DE SIMBOLOS ===\x1b[0m"
    );

    console.log(JSON.stringify(tabelaFiltrada, null, 2));
  }

  // Impede a gravação em caso de falha na compilação
  if (!sucesso) {
    throw new Error(
      "Falha na compilação. Nenhum arquivo foi gerado."
    );
  }

  if (!compiler.codigoGerado?.trim()) {
    throw new Error(
      "O compilador não gerou código Go."
    );
  }

  // Grava o código Go no arquivo especificado
  if (arquivoSaida !== undefined) {
    try {
      writeFileSync(
        arquivoSaida,
        compiler.codigoGerado,
        "utf-8"
      );

      console.log(
        `\x1b[32m[INFO]\x1b[0m Código Go salvo em '${arquivoSaida}'.`
      );
    } catch (err) {
      throw new Error(
        `Falha ao gravar o arquivo '${arquivoSaida}': ${err}`
      );
    }
  }

  // Preserva o comportamento de exibição do código Go
  if (
    showGo ||
    (!arquivoSaida && !showAst && !showTokens && !showTS)
  ) {
    console.log(
      "\n\x1b[35m=== CODIGO GO GERADO ===\x1b[0m"
    );

    console.log(compiler.codigoGerado);
  }
}

// Tratamento centralizado de erros da CLI
run().catch((erro: unknown) => {
  const mensagem =
    erro instanceof Error ? erro.message : String(erro);

  console.error(`\x1b[31m[ERROR]\x1b[0m ${mensagem}`);
  process.exitCode = 1;
});
