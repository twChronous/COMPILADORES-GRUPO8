import { ClientInterface } from '../utils/types';
import AnalyzerModel from '../models/Analyzer.model';

// Importa dinamicamente a lista do arquivo que é auto-gerado antes do build
import { ANALYZERS_REGISTRY } from './analyzers.registry';

/**
 * AnalyzerLoader - Sistema dinâmico e robusto de descoberta e registro de analisadores.
 * 
 * @class
 * @description Descobre automaticamente, valida e registra os analisadores da aplicação.
 */
export default class AnalyzerLoader {
  /**
   * Identificador único para a instância do AnalyzerLoader.
   * 
   * @type {string}
   * @readonly
   */
  public readonly name: string = 'AnalyzerLoader';

  /**
   * Interface do cliente para gerenciamento de logs e estado.
   * 
   * @type {ClientInterface}
   * @private
   * @readonly
   */
  private readonly client: ClientInterface;

  /**
   * Cria uma instância do AnalyzerLoader.
   * 
   * @constructor
   * @param {ClientInterface} client A interface do cliente para gerenciamento.
   */
  constructor(client: ClientInterface) {
    this.client = client;
  }

  /**
   * Carrega os analisadores a partir do registro estático gerado pré-build.
   * 
   * A linha de raciocínio elimina a leitura de disco (fs) e caminhos virtuais.
   * Ao utilizar o `ANALYZERS_REGISTRY`, o bundler embute as dependências nativamente,
   * garantindo execução instantânea e à prova de falhas em qualquer sistema operacional.
   * 
   * @async
   * @returns {Promise<{totalAnalyzers: number, loadTime: number, failedAnalyzers: string[]}>} Métricas de carregamento.
   * @throws {Error} Se ocorrer um erro crítico durante o carregamento.
   */
  public async load(): Promise<{ 
    totalAnalyzers: number; 
    loadTime: number; 
    failedAnalyzers: string[] 
  }> {
    // Registra o tempo exato do início da operação
    const startTime = performance.now();
    
    // Inicia um array vazio para guardar o nome dos analisadores que falharem
    const failedAnalyzers: string[] = [];

    try {
      // Verifica se o registro auto-gerado possui classes mapeadas
      if (ANALYZERS_REGISTRY.length === 0) {
        // Dispara um aviso nos logs se o registro estiver vazio
        this.client.LOG_WARN('No analyzer files discovered in registry', this.name);
        // Encerra o carregamento retornando métricas zeradas
        return { totalAnalyzers: 0, loadTime: 0, failedAnalyzers: [] };
      }

      // Inicia o processo de registro de todas as classes do registro
      const analyzerRegistrations = await this.registerAnalyzers(ANALYZERS_REGISTRY);

      // Calcula o tempo total decorrido subtraindo o tempo inicial do atual
      const loadTime = performance.now() - startTime;
      
      // Imprime o resumo da operação nos logs indicando sucessos e falhas
      this.client.LOG(
        `Loaded ${analyzerRegistrations.successful.length} analyzers ` +
        `(${analyzerRegistrations.failed.length} failed) in ${loadTime.toFixed(2)}ms`, 
        this.name
      );

      // Adiciona as classes reprovadas ao array de retorno
      failedAnalyzers.push(...analyzerRegistrations.failed);

      // Retorna o pacote de métricas consolidado
      return {
        totalAnalyzers: analyzerRegistrations.successful.length,
        loadTime,
        failedAnalyzers
      };

    } catch (error) {
      // Direciona erros críticos de execução para o tratador central
      this.handleLoadError(error);
      throw error;
    }
  }

  /**
   * Registra múltiplos analisadores paralelamente e mapeia resultados.
   * 
   * @private
   * @param {any[]} classes Lista de classes de analisadores do registro.
   * @returns {Promise<{successful: string[], failed: string[]}>} Separação de sucessos e falhas.
   */
  private async registerAnalyzers(classes: any[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    // Processa a validação e instanciação de todas as classes ao mesmo tempo
    const registrationResults = await Promise.all(
      classes.map(AnalyzerClass => this.registerSingleAnalyzer(AnalyzerClass))
    );

    // Constrói e retorna um objeto dividindo os aprovados dos reprovados
    return {
      // Filtra e mapeia apenas os analisadores que retornaram sucesso
      successful: registrationResults
        .filter(result => result.success)
        .map(result => result.className),
      // Filtra e mapeia apenas os analisadores que falharam na validação
      failed: registrationResults
        .filter(result => !result.success)
        .map(result => result.className)
    };
  }

  /**
   * Valida a estrutura e instancia uma classe única de analisador.
   * 
   * @private
   * @param {any} AnalyzerClass A classe do analisador extraída do registro.
   * @returns {Promise<{className: string, success: boolean, error?: Error}>} Resultado do registro.
   */
  private async registerSingleAnalyzer(AnalyzerClass: any): Promise<{
    className: string;
    success: boolean;
    error?: Error;
  }> {
    // Tenta ler o nome da classe ou assume 'UnknownClass' como precaução
    const className = AnalyzerClass?.name || 'UnknownClass';

    try {
      // Rejeita a classe imediatamente se ela não passar no teste estrutural
      if (!this.validateAnalyzerClass(AnalyzerClass)) {
        throw new Error('Invalid analyzer class structure');
      }

      // Cria a instância injetando o contexto do cliente no construtor
      const analyzerInstance = new AnalyzerClass(this.client);
      
      // Adiciona o analisador pronto na lista global da aplicação
      this.client.analyzers.push(analyzerInstance);

      // Sinaliza o registro bem-sucedido no console de logs
      this.client.LOG(`Analyzer registered: ${analyzerInstance.name}`, this.name);

      // Retorna a confirmação de sucesso isolada
      return { className, success: true };
    } catch (error) {
      // Grava o erro específico desta classe sem derrubar as demais
      this.client.LOG_ERR(
        `Analyzer registration failed for ${className}: ${error}`, 
        this.name
      );
      
      // Retorna a falha documentada para as métricas finais
      return { 
        className, 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
    }
  }

  /**
   * Valida se a estrutura da classe atende aos requisitos mínimos.
   * 
   * @private
   * @param {any} AnalyzerClass A classe para validação.
   * @returns {boolean} Se a classe possui estrutura válida.
   */
  private validateAnalyzerClass(AnalyzerClass: any): boolean {
    // Confirma via Duck Typing se o objeto pode atuar como uma classe construtora (new)
    return (
      typeof AnalyzerClass === 'function' && 
      AnalyzerClass.prototype !== undefined
    );
  }

  /**
   * Gerenciamento centralizado de erros para o processo de carregamento.
   * 
   * @private
   * @param {unknown} error O objeto de erro capturado.
   * @description Registra falhas críticas que quebram o ciclo de carregamento.
   */
  private handleLoadError(error: unknown): void {
    // Monta um contexto estruturado com o horário e a mensagem do erro
    const errorContext = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error)
    };

    // Dispara o alerta máximo bloqueando a execução posterior do compilador
    this.client.LOG_ERR(
      `Critical analyzer loading failure: ${JSON.stringify(errorContext)}`, 
      this.name,
      'ANALYZER_LOAD_CRITICAL'
    );
  }
}