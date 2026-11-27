import GeneratorModel from '../models/Generator.model';
import { ClientInterface } from '../utils/types';
import { GENERATORS_REGISTRY } from './generators.registry';

/**
 * GeneratorLoader - Sistema de registro estático e instanciação dos geradores de código.
 *
 * @class
 * @description Descobre, valida e registra os geradores da aplicação a partir do registro pré-build.
 */
export default class GeneratorLoader {
  /**
   * Identificador único para a instância do GeneratorLoader.
   *
   * @type {string}
   * @readonly
   */
  public readonly name: string = 'GeneratorLoader';

  /**
   * Interface do cliente para gerenciamento de logs e estado.
   *
   * @type {ClientInterface}
   * @private
   * @readonly
   */
  private readonly client: ClientInterface;

  /**
   * Cria uma instância do GeneratorLoader.
   *
   * @constructor
   * @param {ClientInterface} client A interface do cliente para gerenciamento.
   */
  constructor(client: ClientInterface) {
    this.client = client;
  }

  /**
   * Carrega os geradores a partir do registro estático gerado pré-build.
   *
   * @async
   * @param {any[]} [registry=GENERATORS_REGISTRY] Lista de classes de geradores a registrar.
   * @returns {Promise<{totalGenerators: number, loadTime: number, failedGenerators: string[]}>} Métricas de carregamento.
   */
  public async load(registry: any[] = GENERATORS_REGISTRY): Promise<{
    totalGenerators: number;
    loadTime: number;
    failedGenerators: string[];
  }> {
    const startTime = performance.now();

    if (registry.length === 0) {
      this.client.LOG_WARN('No generator files discovered in registry', this.name);
      return { totalGenerators: 0, loadTime: 0, failedGenerators: [] };
    }

    this.client.generators ??= [];
    const results = registry.map((GeneratorClass) =>
      this.registerSingleGenerator(GeneratorClass)
    );

    const totalGenerators = results.filter((r) => r.success).length;
    const failedGenerators = results.filter((r) => !r.success).map((r) => r.className);
    const loadTime = performance.now() - startTime;

    this.client.LOG(
      `Loaded ${totalGenerators} generators (${failedGenerators.length} failed) in ${loadTime.toFixed(2)}ms`,
      this.name
    );

    return { totalGenerators, loadTime, failedGenerators };
  }

  /**
   * Valida a estrutura e instancia uma classe única de gerador.
   *
   * @private
   * @param {any} GeneratorClass Classe do gerador extraída do registro.
   * @returns {{className: string, success: boolean}} Resultado do registro.
   */
  private registerSingleGenerator(GeneratorClass: any): {
    className: string;
    success: boolean;
  } {
    const className = GeneratorClass?.name || 'UnknownClass';

    try {
      const ehConstrutorValido =
        typeof GeneratorClass === 'function' &&
        GeneratorClass.prototype instanceof GeneratorModel;

      if (!ehConstrutorValido) {
        throw new Error('Invalid generator class structure: must extend GeneratorModel');
      }

      const generatorInstance = new GeneratorClass(this.client);
      this.client.generators!.push(generatorInstance);
      this.client.LOG(`Generator registered: ${generatorInstance.name} (${generatorInstance.output})`, this.name);

      return { className, success: true };
    } catch (error) {
      this.client.LOG_ERR(
        `Generator registration failed for ${className}: ${error}`,
        this.name
      );
      return { className, success: false };
    }
  }
}
