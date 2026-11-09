import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Analisa a pasta de analisadores e gera o arquivo de registro estático automaticamente.
 * 
 * A linha de raciocínio resolve o impasse entre dinamismo de desenvolvimento e 
 * estabilidade do binário compilado. Este script varre a pasta antes do build,
 * descobre os arquivos e escreve um arquivo TypeScript exportando todos eles.
 * Isso garante importações nativas seguras sem vazamento de caminhos do servidor.
 * 
 * @returns {Promise<void>}
 */
async function generateRegistry(): Promise<void> {
  // Define o caminho físico da pasta de analisadores no sistema local
  const analyzersDir = path.join(import.meta.dir, "../analyzers");
  
  // Define o caminho onde o arquivo de registro será salvo
  const registryPath = path.join(import.meta.dir, "../loaders/analyzers.registry.ts");

  try {
    // Lê todos os arquivos dentro do diretório de analisadores
    const files = await readdir(analyzersDir);
    
    // Filtra apenas os arquivos que terminam com a extensão '.ts' (ignorando '.spec.ts' ou '.d.ts')
    const tsFiles = files.filter(f => f.endsWith('.ts') && !f.includes('.spec') && !f.includes('.d.ts'));

    // Inicia a string que conterá o código fonte do arquivo gerado
    let fileContent = `// ARQUIVO GERADO AUTOMATICAMENTE. NÃO EDITE MANUALMENTE.\n\n`;
    
    // Inicia o array que armazenará os nomes das classes importadas
    const classNames: string[] = [];

    // Itera sobre cada arquivo TypeScript encontrado na pasta
    for (const file of tsFiles) {
      // Remove a extensão '.ts' para usar como nome do módulo e identificador
      const baseName = file.replace('.ts', '');
      
      // Remove caracteres especiais para gerar um nome de variável válido em TS
      const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '');
      
      // Adiciona o nome seguro ao array de classes para uso posterior
      classNames.push(safeName);
      
      // Adiciona a instrução de importação ao topo do conteúdo do arquivo
      fileContent += `import ${safeName} from '../analyzers/${baseName}';\n`;
    }

    // Adiciona a exportação do array contendo todas as classes importadas
    fileContent += `\nexport const ANALYZERS_REGISTRY = [\n  ${classNames.join(',\n  ')}\n];\n`;

    // Escreve o código gerado no arquivo final de registro
    await writeFile(registryPath, fileContent, "utf-8");
    
    // Imprime a confirmação visual de sucesso no terminal
    console.log(`[Gerador] Registro criado com sucesso. ${tsFiles.length} analisadores vinculados.`);
  } catch (error) {
    // Interrompe o processo alertando sobre a falha na leitura ou escrita
    console.error(`[Gerador] Falha ao gerar registro dinâmico:`, error);
    process.exit(1);
  }
}

// Inicia a execução imediata do gerador
generateRegistry();