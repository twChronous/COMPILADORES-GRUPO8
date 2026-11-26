import { readFileSync, writeFileSync } from "fs";
import Compiler from "./Compiler";

// Extrai os argumentos repassados via linha de comando
const args = process.argv.slice(2);

/**
 * Extrai o caminho do arquivo de saída (--out / -o) e os índices de argumentos consumidos.
 */
function extrairOpcoesSaida(listaArgs: string[]): {
  arquivoSaida?: string;
  indicesConsumidos: Set<number>;
} {
  const indicesConsumidos = new Set<number>();
  let arquivoSaida: string | undefined;

  for (let i = 0; i < listaArgs.length; i++) {
    const arg = listaArgs[i];
    if (arg === "--out" || arg === "-o") {
      indicesConsumidos.add(i);
      if (i + 1 < listaArgs.length && !listaArgs[i + 1].startsWith("-")) {
        arquivoSaida = listaArgs[i + 1];
        indicesConsumidos.add(i + 1);
      }
    } else if (arg.startsWith("--out=")) {
      arquivoSaida = arg.slice("--out=".length);
      indicesConsumidos.add(i);
    } else if (arg.startsWith("-o=")) {
      arquivoSaida = arg.slice("-o=".length);
      indicesConsumidos.add(i);
    }
  }

  return { arquivoSaida, indicesConsumidos };
}

// Mapeia as flags booleanas e argumentos de entrada/saída
const help = args.includes("--help") || args.includes("-h");
const verbose = args.includes("--verbose");
const showAst = args.includes("--ast");
const showTokens = args.includes("--tokens");
const showTS = args.includes("--ts");
const showGo = args.includes("--go");
const { arquivoSaida, indicesConsumidos } = extrairOpcoesSaida(args);

// O arquivo fonte será o primeiro argumento posicional não consumido por flags
const arquivoFonte = args.find(
  (arg, indice) => !arg.startsWith("-") && !indicesConsumidos.has(indice)
);

// Intercepta a execução se a flag de ajuda for chamada
if (help) {
  console.log(`
Uso: run src/index.ts [arquivo.js] [opcoes]

Opções:
  -h, --help          Exibe esta tela de ajuda e encerra a execução.
  --verbose           Ativa logs detalhados do processo de compilacao (Lexer, Parser, etc).
  --ast               Imprime a Arvore Sintatica Abstrata (AST) final no terminal.
  --tokens            Imprime a entrada em tokens final no terminal.
  --ts                Imprime a tabela de simbolos no terminal.
  --go                Imprime o codigo Go gerado no terminal.
  -o, --out <arquivo> Salva o codigo Go gerado no arquivo especificado.

Exemplos de uso:
  run src/index.ts teste.js
  run src/index.ts teste.js --verbose
  run src/index.ts teste.js --tokens
  run src/index.ts teste.js --ts
  run src/index.ts teste.js --go
  run src/index.ts teste.js --out saida.go
  run src/index.ts teste.js --ast --verbose
  run src/index.ts teste.js --tokens --ast --verbose
  `);
  process.exit(0);
}
async function run() {
  const compiler = new Compiler({ verbose, showAst, showTokens, showGo });
  let input = "";

  if (arquivoFonte) {
    try {
      input = readFileSync(arquivoFonte, "utf-8");
    } catch (err: any) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Falha ao ler o arquivo '${arquivoFonte}': ${err.message}`);
      process.exit(1);
    }
  } else {
    // Modo de fallback embutido, ideal para desenvolvimento rápido
    if (verbose) {
      console.log("\x1b[33m[INFO]\x1b[0m Nenhum arquivo .js detectado. Utilizando o bloco de código interno (fallback).");
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

  // Executa toda a esteira de loaders, léxico, sintático e semântico
  const sucesso = await compiler.compile(input);

  // Saída formatada opcional baseada em flag
  if (showAst && compiler.ast) {
    console.log("\n\x1b[35m=== AST GERADA ===\x1b[0m");
    console.log(JSON.stringify(compiler.ast, null, 2));
  }

  if (showTokens && compiler.tokens) {
    console.log("\n\x1b[35m=== TOKENS ===\x1b[0m");
    console.log(JSON.stringify(compiler.tokens, null, 2));
  }
  if (showTS && compiler.tabelaSimbolos) {
    const tabela_filtrada = compiler.tabelaSimbolos.filter(
        (simbolo) => simbolo.linhaDeclaracao > 0
      );
    console.log("\n\x1b[35m=== TABELA DE SIMBOLOS ===\x1b[0m");
    console.log(JSON.stringify(tabela_filtrada, null, 2));
  }

  if (sucesso && compiler.codigoGerado) {
    if (arquivoSaida) {
      writeFileSync(arquivoSaida, compiler.codigoGerado, "utf-8");
      console.log(`\x1b[32m[INFO]\x1b[0m Código Go salvo em '${arquivoSaida}'.`);
    }
    if (showGo || (!arquivoSaida && !showAst && !showTokens && !showTS)) {
      console.log("\n\x1b[35m=== CODIGO GO GERADO ===\x1b[0m");
      console.log(compiler.codigoGerado);
    }
  }
  // Define um código de saída apropriado para ferramentas de CI/CD
  if (!sucesso) {
    process.exit(1);
  }
}

run();
