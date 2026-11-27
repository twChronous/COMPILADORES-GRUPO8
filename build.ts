import Bun from "bun";

/**
 * Realiza a compilação da aplicação CLI para múltiplos sistemas operacionais.
 * 
 * A linha de raciocínio conecta o script ao GitHub Actions. O código captura 
 * as variáveis de ambiente `BUILD_TARGET` e `BUILD_OUTFILE` para definir o 
 * sistema operacional e o nome do arquivo dinamicamente, permitindo gerar 
 * binários para Windows, Linux e Mac usando um único script de build.
 * 
 * @returns {Promise<void>}
 */
async function buildCli(): Promise<void> {
  // Captura o sistema operacional alvo da variável de ambiente ou usa Linux como padrão
  const targetOS = (process.env.BUILD_TARGET || "bun-linux-x64") as any;
  
  // Captura o nome do arquivo de saída da variável de ambiente ou usa um nome padrão
  const outputPath = process.env.BUILD_OUTFILE || "./dist/compilador";

  // Executa a compilação principal chamando a API do Bun
  const result = await Bun.build({
    // Define o ponto de entrada principal do projeto
    entrypoints: ["./src/index.ts"],
    // Agrupa todas as opções de geração do binário standalone
    compile: {
      // Configura a arquitetura alvo dinamicamente baseada na esteira CI/CD
      target: targetOS,
      // Define o nome e o diretório do arquivo final dinamicamente
      outfile: outputPath,
      // Bloqueia o carregamento automático de variáveis de ambiente no build
      autoloadDotenv: false,
      // Bloqueia a leitura automática do arquivo de configuração do bun
      autoloadBunfig: false,
      // Embute a pasta de analisadores na memória virtual do binário (VFS)
      assets: [
        "src/analyzers",
        "src/analyzers/Lexycal.analyzer.ts",
        "src/analyzers/Syntactic.analyzer.ts",
        "src/analyzers/Semantical.analyzer.ts",
      ]
    },
    // Comprime o código para reduzir o tamanho do arquivo
    minify: true,
    // Vincula o mapa de código original para facilitar a depuração de erros
    sourcemap: "linked",
    // Habilita o cache em bytecode para acelerar a inicialização
    bytecode: true,
  });

  // Valida o sucesso do processo de compilação
  if (result.success) {
    // Imprime o caminho do executável gerado no terminal
    console.log(`Build successful for ${targetOS}: ${result.outputs[0].path}`);
  } else {
    // Imprime a lista de erros em caso de falha no agrupamento
    console.error(`Build failed for ${targetOS}:`, result.logs);
    // Força o encerramento do script com um código de erro
    process.exit(1);
  }
}

// Inicia a execução da função de build
buildCli();