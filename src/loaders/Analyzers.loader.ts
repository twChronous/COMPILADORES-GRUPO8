import path from 'node:path';
import { readdir } from "node:fs/promises";
import { ClientInterface } from '../utils/types';
import AnalyzerModel from '../models/Analyzer.model';

/**
 * Configuration interface for AnalyzerLoader
 * @interface AnalyzerLoaderConfig
 */
interface AnalyzerLoaderConfig {
  /** 
   * Directory path containing analyzer files
   * @type {string}
   */
  DIR_ANALYZER: string;

  /** 
   * Supported file extensions for analyzer discovery
   * @type {string[]}
   */
  ANALYZER_EXTENSIONS: string[];

  /** 
   * Maximum directory depth for recursive analyzer discovery
   * @type {number}
   */
  MAX_ROUTE_DEPTH: number;

  /** 
   * Optional regex patterns to ignore during analyzer file discovery
   * @type {RegExp[]}
   */
  IGNORE_PATTERNS?: RegExp[];
}

/**
 * Configuração padrão para o carregador de analisadores.
 * 
 * `import.meta.dir` ancora o caminho ao Virtual File System (VFS) do Bun durante a compilação,
 * impedindo que o executável procure a pasta no disco físico do usuário.
 * 
 * @type {AnalyzerLoaderConfig}
 */
const CONFIG: AnalyzerLoaderConfig = {
  DIR_ANALYZER: path.join(import.meta.dir, '../analyzers'),
  ANALYZER_EXTENSIONS: ['.ts'],
  MAX_ROUTE_DEPTH: 5,
  IGNORE_PATTERNS: [
    /\.spec\.[tj]s$/, // Ignora arquivos de teste
    /\.d\.ts$/, // Ignora arquivos de definição de tipos
  ]
};

/**
 * AnalyzerLoader - A dynamic and robust analyzer discovery and registration system
 * 
 * @class
 * @description Automatically discovers, validates, and registers application analyzers
 */
export default class AnalyzerLoader {
  /**
   * Unique identifier for the AnalyzerLoader instance
   * @type {string}
   * @readonly
   */
  public readonly name: string = 'AnalyzerLoader';

  /**
   * Client interface for logging and analyzer management
   * @type {ClientInterface}
   * @private
   * @readonly
   */
  private readonly client: ClientInterface;

  /**
   * Merged configuration for analyzer loading
   * @type {AnalyzerLoaderConfig}
   * @private
   * @readonly
   */
  private readonly config: AnalyzerLoaderConfig;

  /**
   * Creates an instance of AnalyzerLoader
   * 
   * @constructor
   * @param {ClientInterface} client - The client interface for analyzer management
   * @param {Partial<AnalyzerLoaderConfig>} [customConfig={}] - Optional custom configuration
   */
  constructor(
    client: ClientInterface, 
    customConfig: Partial<AnalyzerLoaderConfig> = {}
  ) {
    this.client = client;
    this.config = { ...CONFIG, ...customConfig };
  }

  /**
   * Loads analyzer from the specified directory
   * 
   * @async
   * @returns {Promise<{
   *   totalAnalyzers: number, 
   *   loadTime: number, 
   *   failedAnalyzers: string[]
   * }>} Analyzer loading metrics
   * 
   * @throws {Error} If critical error occurs during analyzer loading
   */
  public async load(): Promise<{ 
    totalAnalyzers: number; 
    loadTime: number; 
    failedAnalyzers: string[] 
  }> {
    const startTime = performance.now();
    const failedAnalyzers: string[] = [];

    try {
      const analyzerFiles = await this.findAnalyzerFiles(this.config.DIR_ANALYZER);
      
      if (analyzerFiles.length === 0) {
        this.client.LOG_WARN('No analyzer files discovered', this.name);
        return { totalAnalyzers: 0, loadTime: 0, failedAnalyzers: [] };
      }

      const analyzerRegistrations = await this.registerAnalyzer(analyzerFiles);

      const loadTime = performance.now() - startTime;
      
      this.client.LOG(
        `Loaded ${analyzerRegistrations.successful.length} analyzers ` +
        `(${analyzerRegistrations.failed.length} failed) in ${loadTime.toFixed(2)}ms`, 
        this.name
      );

      failedAnalyzers.push(...analyzerRegistrations.failed);

      return {
        totalAnalyzers: analyzerRegistrations.successful.length,
        loadTime,
        failedAnalyzers
      };

    } catch (error) {
      this.handleLoadError(error);
      throw error;
    }
  }

  /**
   * Descobre arquivos de analisadores embutidos no sistema de arquivos virtual (VFS).
   * 
   * A linha de raciocínio substitui o `Bun.Glob` (que requer o sistema de arquivos físico)
   * pela função nativa `readdir` do Node com recursão ativada. O Bun intercepta o módulo `fs`
   * em binários compilados, permitindo que a varredura ocorra perfeitamente dentro 
   * dos assets embutidos em memória.
   * 
   * @private
   * @param {string} dirPath O diretório raiz para buscar os analisadores.
   * @returns {Promise<string[]>} Lista de caminhos completos dos arquivos encontrados.
   */
  private async findAnalyzerFiles(dirPath: string): Promise<string[]> {
    try {
      // Cria um array vazio para armazenar os caminhos aprovados
      const files: string[] = [];
      
      // Lê todo o conteúdo do diretório recursivamente na memória virtual (VFS)
      // Esta API nativa retorna um array de strings com os caminhos relativos
      const entries = await readdir(dirPath, { recursive: true });

      // Inicia um laço de repetição para processar cada entrada do diretório
      for (const relativePath of entries) {
        // Converte o caminho relativo para string garantindo o formato correto
        const rawPath = relativePath.toString();
        // Substitui barras invertidas do Windows por barras convencionais
        const normalizedPath = rawPath.replace(/\\/g, '/');
        // Extrai apenas o nome do arquivo presente no final do caminho
        const fileName = path.basename(normalizedPath);
        
        // Verifica se a extensão do arquivo pertence à lista configurada
        // O array config.ANALYZER_EXTENSIONS dita os formatos aceitos
        const hasValidExtension = this.config.ANALYZER_EXTENSIONS.some(ext => 
          fileName.endsWith(ext)
        );

        // Ignora a entrada atual se ela for uma pasta ou possuir formato inválido
        if (!hasValidExtension) {
          // Pula imediatamente para a próxima iteração
          continue;
        }

        // Calcula a profundidade de subpastas contando os separadores de diretório
        const depth = normalizedPath.split('/').length - 1;

        // Compara a profundidade da pasta atual com o limite máximo estabelecido
        if (depth > this.config.MAX_ROUTE_DEPTH) {
          // Descarta o arquivo se ele estiver muito profundo na árvore
          continue;
        }

        // Verifica se o nome do arquivo ativa alguma regra de exclusão
        // O array IGNORE_PATTERNS contém expressões regulares de filtragem
        const isIgnored = this.config.IGNORE_PATTERNS?.some(pattern => 
          pattern.test(fileName)
        );

        // Bloqueia o processamento caso o arquivo combine com as exclusões
        if (isIgnored) {
          // Descarta a entrada atual e avança
          continue;
        }

        // Constrói o caminho completo unindo a raiz ao caminho relativo validado
        files.push(path.join(dirPath, rawPath));
      }

      // Retorna a lista final de caminhos descobertos para o loader
      return files;

    } catch (error) {
      // Registra o erro no sistema de logs da interface do cliente
      this.client.LOG_ERR(
        `Analyzer discovery error in ${dirPath}: ${error}`, 
        this.name
      );
      // Retorna uma lista vazia para impedir a interrupção abrupta da execução
      return [];
    }
  }
  /**
   * Registers analyzers in parallel with detailed tracking
   * 
   * @private
   * @param {string[]} files - List of analyzer file paths
   * @returns {Promise<{
   *   successful: string[], 
   *   failed: string[]
   * }>} Registration results
   */
  private async registerAnalyzer(files: string[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const registrationResults = await Promise.all(
      files.map(file => this.registerSingleAnalyzer(file))
    );

    return {
      successful: registrationResults
        .filter(result => result.success)
        .map(result => result.file),
      failed: registrationResults
        .filter(result => !result.success)
        .map(result => result.file)
    };
  }

  /**
   * Registers a single analyzer with granular error handling, extracting the class from ES Modules.
   * 
   * A linha de raciocínio resolve o desempacotamento de Módulos ES (ES Modules) durante 
   * a importação dinâmica. A função extrai a exportação padrão (`default`) ou cai na 
   * primeira exportação nomeada caso o `default` esteja ausente, garantindo que o 
   * artefato validado seja de fato a classe do analisador.
   * 
   * @private
   * @param {string} file Caminho do arquivo do analisador.
   * @returns {Promise<{file: string, success: boolean, error?: Error}>} Resultado do registro.
   */
  private async registerSingleAnalyzer(file: string): Promise<{
    file: string;
    success: boolean;
    error?: Error;
  }> {
    try {
      // Resolve o caminho absoluto do arquivo para garantir a leitura correta
      const analyzerPath = path.resolve(file);
      
      // Importa dinamicamente o módulo do sistema de arquivos virtual
      const analyzerModule = await import(analyzerPath);
      
      // Extrai a classe priorizando a exportação padrão (export default)
      // Se não houver default, extrai o primeiro valor exportado do módulo
      const AnalyzerClass = analyzerModule.default || Object.values(analyzerModule)[0];

      // Valida se o artefato extraído obedece à estrutura de classe esperada
      if (!this.validateAnalyzerClass(AnalyzerClass)) {
        throw new Error('Invalid analyzer class structure');
      }

      // Cria uma nova instância do analisador injetando a interface do cliente
      const analyzerInstance = new AnalyzerClass(this.client);
      
      // Armazena a instância validada no array principal do cliente
      this.client.analyzers.push(analyzerInstance);

      // Registra o sucesso da operação nos logs do sistema
      this.client.LOG(`Analyzer registered: ${analyzerInstance.name}`, this.name);

      // Retorna sucesso para o orquestrador de carregamento
      return { file, success: true };
    } catch (error) {
      // Registra a falha específica deste arquivo nos logs de erro
      this.client.LOG_ERR(
        `Analyzer registration failed for ${file}: ${error}`, 
        this.name
      );
      
      // Retorna a falha isolada sem quebrar o processamento de outros arquivos
      return { 
        file, 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
    }
  }
  /**
   * Validates the structure of a analyzer class
   * 
   * @private
   * @param {any} AnalyzerClass - Analyzer class to validate
   * @returns {boolean} Whether the analyzer class is valid
   */
    private validateAnalyzerClass(AnalyzerClass: any): boolean {
    // Retorna verdadeiro se for uma função e possuir um protótipo definido
    // Isso garante que o artefato pode ser instanciado com a palavra-chave 'new'
    return (
      typeof AnalyzerClass === 'function' && 
      AnalyzerClass.prototype !== undefined
    );
  }

  /**
   * Centralized error management for analyzer loading
   * 
   * @private
   * @param {unknown} error - Error object or message
   * @description Logs critical errors during analyzer loading
   */
  private handleLoadError(error: unknown): void {
    const errorContext = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error)
    };

    this.client.LOG_ERR(
      `Critical analyzer loading failure: ${JSON.stringify(errorContext)}`, 
      this.name,
      'ANALYZER_LOAD_CRITICAL'
    );
  }
}