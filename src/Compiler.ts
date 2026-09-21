import Loaders from "./loaders";
import AnalyzerLoader from "./loaders/Analyzers.loader.ts";
import { ClientInterface, LoaderInitConfig, LoaderResult } from "./utils/types";

/**
 * Classe Compiler principal que gerencia a aplicação
 * Implementa a interface ClientInterface
 * 
 * @class
 * @implements {ClientInterface}
 */
export default class Compiler implements ClientInterface {

  public analyzers: any[];
    /**
     * Construtor da classe Compiler
     * Inicializa a aplicação Express e configura middlewares
     */
    constructor() {
      this.analyzers = [];
    }
    /**
 * Inicializa todos os loaders da aplicação
 * Carrega módulos e registra o status de cada um
 * 
 * @private
 * @async
 * @param {LoaderInitConfig} [config={}] - Configurações de inicialização
 * @returns {Promise<LoaderResult[]>} Resultados detalhados dos loaders
 */
public async initializeLoaders(
    config: LoaderInitConfig = {}
): Promise<LoaderResult[]> {
    // Configurações padrão
    const defaultConfig: LoaderInitConfig = {
        maxFailureThreshold: 0.5,
        globalTimeout: 30000,
        parallel: true
    };
    const finalConfig = { ...defaultConfig, ...config };

    // Início da medição de tempo total
    const startTime = performance.now();
    const loaders: Array<typeof Loaders[keyof typeof Loaders]> = Object.values(Loaders);

    // Função para carregar um loader individual
    const loadLoader = async (LoaderClass: any): Promise<LoaderResult> => {
        const loaderStartTime = performance.now();
        const loaderInstance = new LoaderClass(this);

        try {
            const loadResult = await (loaderInstance as AnalyzerLoader).load();
            const duration = performance.now() - loaderStartTime;

            return {
                name: loaderInstance.name,
                success: true,
                duration,
                details: loadResult
            };
        } catch (error) {
            const duration = performance.now() - loaderStartTime;
            
            this.LOG_ERR(
                `Loader ${loaderInstance.name} failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                'LOADERS'
            );

            return {
                name: loaderInstance.name,
                success: false,
                duration,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };

    // Carregamento de loaders
    let loaderResults: LoaderResult[];
    try {
        // Execução em paralelo ou sequencial
        loaderResults = finalConfig.parallel
            ? await Promise.all(loaders.map(loadLoader))
            : await loaders.reduce(
                async (acc, loader) => [...await acc, await loadLoader(loader)], 
                Promise.resolve([] as LoaderResult[])
            );
    } catch (globalError) {
        // Tratamento de erro global
        this.LOG_ERR(
            `Critical loader initialization error: ${
                globalError instanceof Error ? globalError.message : String(globalError)
            }`,
            'LOADERS'
        );
        throw globalError;
    }

    // Análise de resultados
    const totalDuration = performance.now() - startTime;
    const successfulLoaders = loaderResults.filter(result => result.success);
    const failedLoaders = loaderResults.filter(result => !result.success);

    // Log de resumo
    this.LOG(
        `Loader Summary: ` +
        `${successfulLoaders.length}/${loaders.length} loaded, ` +
        `Total Duration: ${totalDuration.toFixed(2)}ms`,
        'LOADERS'
    );

    // Verificação de limite de falhas
    const failureRate = failedLoaders.length / loaders.length;
    if (failureRate > (finalConfig.maxFailureThreshold || 0.5)) {
        const errorMessage = `Critical: ${failedLoaders.length} loaders failed (${(failureRate * 100).toFixed(2)}%)`;
        this.LOG_ERR(errorMessage, 'LOADERS');
        throw new Error(errorMessage);
    }

    // Opcional: Detalhes de desempenho
    this.logLoaderPerformance(loaderResults);

    return loaderResults;
}



    /**
     * Registra log de informação colorido no console
     * 
     * @param {...string} args - Argumentos para log
     */
    public LOG(...args: string[]): void {
        const Sendlog = (args.length > 1 ? `\x1b[32m${args.map(t => `[${t}]`).slice(1).join(' ')}\x1b[0m` : '') + ` \x1b[34m${args[0]}\x1b[0m`;
        console.log(Sendlog);
    }

    /**
     * Registra log de erro colorido no console
     * 
     * @param {...string} args - Argumentos para log de erro
     */
    public LOG_ERR(...args: string[]): void {
        const error = args[0];
        const Sendlog = (args.length > 1 ? args.slice(1).map(t => `\x1b[33m[${t}]\x1b[0m`) : '');
        console.error('\x1b[31m[ERROR]\x1b[0m', ...Sendlog, error);
    }

    /**
     * Registra log de aviso colorido no console
     * 
     * @param {...string} args - Argumentos para log de aviso
     */
    public LOG_WARN(...args: string[]): void {
        const warning = args[0];
        const Sendlog = (args.length > 1 ? args.slice(1).map(t => `\x1b[33m[${t}]\x1b[0m`) : '');
        console.warn('\x1b[33m[WARNING]\x1b[0m', ...Sendlog, warning);
    }

    /**
     * Lança um erro com a mensagem especificada
     * 
     * @param {any} err - Erro a ser lançado
     * @throws {Error}
     */
    public Error(err: any): void {
        throw new Error(err.message ? err.message : String(err));
    }
        /**
     * Log detalhado de desempenho dos loaders
     * 
     * @private
     * @param {LoaderResult[]} results - Resultados dos loaders
     */
    private logLoaderPerformance(results: LoaderResult[]): void {
        // Ordenar loaders por tempo de carregamento
        const sortedByDuration = [...results].sort((a, b) => b.duration - a.duration);

        this.LOG('Loader Performance Breakdown:', 'PERFORMANCE');
        sortedByDuration.forEach(result => {
            this.LOG(
                `${result.name}: ${result.duration.toFixed(2)}ms`, 
                'PERFORMANCE'
            );
        });
    }
}