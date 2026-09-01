import path from 'node:path';
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
 * Default configuration for AnalyzersLoader
 * @type {AnalyzerLoaderConfig}
 */
const CONFIG: AnalyzerLoaderConfig = {
  DIR_ANALYZER: 'src/analyzers',
  ANALYZER_EXTENSIONS: ['.ts'],
  MAX_ROUTE_DEPTH: 5,
  IGNORE_PATTERNS: [
    /\.spec\.[tj]s$/, // Ignore test files
    /\.d\.ts$/, // Ignore type definition files
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
   * Discovers analyzer files using Bun's native Glob API.
   * Substitui a recursão manual com readdirSync por uma única
   * varredura recursiva nativa do Bun, filtrando por profundidade
   * máxima e padrões de exclusão.
   * 
   * @private
   * @param {string} dirPath - Directory path to search for analyzer
   * @returns {Promise<string[]>} List of discovered analyzer file paths
   */
  private async findAnalyzerFiles(dirPath: string): Promise<string[]> {
    try {
      const extPattern = this.config.ANALYZER_EXTENSIONS
        .map(ext => ext.replace(/^\./, ''))
        .join(',');

      const glob = new Bun.Glob(`**/*.{${extPattern}}`);
      const files: string[] = [];

      for await (const relativePath of glob.scan({ cwd: dirPath, onlyFiles: true })) {
        // relativePath usa sempre '/' como separador, independente do SO
        const depth = relativePath.split('/').length - 1;

        if (depth > this.config.MAX_ROUTE_DEPTH) {
          continue;
        }

        const fileName = path.basename(relativePath);
        const isIgnored = this.config.IGNORE_PATTERNS?.some(pattern => pattern.test(fileName));

        if (isIgnored) {
          continue;
        }

        files.push(path.join(dirPath, relativePath));
      }

      return files;

    } catch (error) {
      this.client.LOG_ERR(
        `Analyzer discovery error in ${dirPath}: ${error}`, 
        this.name
      );
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
   * Registers a single analyzer with granular error handling
   * 
   * @private
   * @param {string} file - analyzer file path
   * @returns {Promise<{
   *   file: string, 
   *   success: boolean, 
   *   error?: Error
   * }>} Registration result for a single analyzer
   */
  private async registerSingleAnalyzer(file: string): Promise<{
    file: string;
    success: boolean;
    error?: Error;
  }> {
    try {
      const analyzerPath = path.resolve(file);
      const analyzerModule = await import(analyzerPath);
      const AnalyzerClass = analyzerModule.default;

      if (!this.validateAnalyzerClass(AnalyzerClass)) {
        throw new Error('Invalid analyzer class structure');
      }

      const analyzerInstance = new AnalyzerClass(this.client);
      this.client.analyzers.push(analyzerInstance);

      this.client.LOG(`Analyzer registered: ${analyzerInstance.path}`, this.name);

      return { file, success: true };
    } catch (error) {
      this.client.LOG_ERR(
        `Analyzer registration failed for ${file}: ${error}`, 
        this.name
      );
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
    return (
      typeof AnalyzerClass === 'function' && 
      AnalyzerClass.prototype instanceof AnalyzerModel
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