import { readFileSync } from "fs";
import Compiler from "./Compiler";

// Extrai os argumentos repassados via linha de comando
const args = process.argv.slice(2);

// Mapeia as flags booleanas
const help = args.includes("--help") || args.includes("-h");
const verbose = args.includes("--verbose");
const showAst = args.includes("--ast");
const showTokens = args.includes("--tokens");

// O arquivo fonte será o primeiro argumento que não começa com um traço "--"
const arquivoFonte = args.find(arg => !arg.startsWith("--"));

// Intercepta a execução se a flag de ajuda for chamada
if (help) {
  console.log(`
Uso: run src/index.ts [arquivo.js] [opcoes]

Opções:
  -h, --help     Exibe esta tela de ajuda e encerra a execução.
  --verbose      Ativa logs detalhados do processo de compilacao (Lexer, Parser, etc).
  --ast          Imprime a Arvore Sintatica Abstrata (AST) final no terminal.
  --tokens       Imprime a entrada em tokens final no terminal.

Exemplos de uso:
  run src/index.ts teste.js
  run src/index.ts teste.js --verbose
  run src/index.ts teste.js --tokens
  run src/index.ts teste.js --ast --verbose
  run src/index.ts teste.js --tokens --ast --verbose
  `);
  process.exit(0);
}
async function run() {
  const compiler = new Compiler({ verbose, showAst, showTokens });
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
  // Define um código de saída apropriado para ferramentas de CI/CD
  if (!sucesso) {
    process.exit(1);
  }
}

run();
