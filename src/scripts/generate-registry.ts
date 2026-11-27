import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Varre um diretório de módulos TypeScript e gera um arquivo de registro estático.
 *
 * @param dirOrigem Caminho relativo do diretório de origem em relação a este script.
 * @param caminhoRegistro Caminho relativo do arquivo de registro a ser gerado.
 * @param nomeExport Nome da constante exportada no registro.
 * @param prefixoImport Prefixo de importação relativo ao arquivo de registro.
 * @param rotulo Descrição do tipo de módulo para mensagens de log.
 * @param sufixo Sufixo esperado para os arquivos de módulo (ex.: `.analyzer.ts` ou `.generator.ts`).
 */
async function gerarRegistro(
  dirOrigem: string,
  caminhoRegistro: string,
  nomeExport: string,
  prefixoImport: string,
  rotulo: string,
  sufixo: string
): Promise<void> {
  const origemDir = path.join(import.meta.dir, dirOrigem);
  const registryPath = path.join(import.meta.dir, caminhoRegistro);

  const files = await readdir(origemDir);
  const tsFiles = files
    .filter((f) => f.endsWith(sufixo) && !f.includes(".spec") && !f.includes(".d.ts"))
    .sort();

  const imports: string[] = [];
  const classNames: string[] = [];

  for (const file of tsFiles) {
    const baseName = file.replace(".ts", "");
    const safeName = baseName.replace(/[^a-zA-Z0-9]/g, "");
    classNames.push(safeName);
    imports.push(`import ${safeName} from '${prefixoImport}/${baseName}';`);
  }

  const fileContent = [
    "// ARQUIVO GERADO AUTOMATICAMENTE. NÃO EDITE MANUALMENTE.",
    "",
    ...imports,
    "",
    `export const ${nomeExport} = [\n  ${classNames.join(",\n  ")}\n];`,
    "",
  ].join("\n");

  await writeFile(registryPath, fileContent, "utf-8");
  console.log(`[Gerador] Registro criado com sucesso. ${tsFiles.length} ${rotulo} vinculados.`);
}

/**
 * Gera os registros estáticos de analisadores e geradores antes do build/execução.
 */
async function generateRegistries(): Promise<void> {
  try {
    await gerarRegistro(
      "../analyzers",
      "../loaders/analyzers.registry.ts",
      "ANALYZERS_REGISTRY",
      "../analyzers",
      "analisadores",
      ".analyzer.ts"
    );
    await gerarRegistro(
      "../generators",
      "../loaders/generators.registry.ts",
      "GENERATORS_REGISTRY",
      "../generators",
      "geradores",
      ".generator.ts"
    );
  } catch (error) {
    console.error(`[Gerador] Falha ao gerar registro dinâmico:`, error);
    process.exit(1);
  }
}

generateRegistries();
