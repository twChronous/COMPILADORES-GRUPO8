/**
 * Interface de cliente para gerenciamento de aplicação
 * Fornece acesso a recursos e utilitários do sistema
 */
export interface ClientInterface {
    analyzers: AnalyzerModelOptions[];
    /**
     * Método para log de informações gerais
     * @param args Argumentos a serem logados
     */
    LOG(...args: string[]): void;
    
    /**
     * Método para log de erros
     * @param args Argumentos de erro a serem logados
     */
    LOG_ERR(...args: string[]): void;
    
    /**
     * Método para log de avisos
     * @param args Argumentos de aviso a serem logados
     */
    LOG_WARN(...args: string[]): void;
    
    /**
     * Método para tratamento de erros
     * @param args Detalhes do erro
     */
    Error(...args: string[]): void;
}
/**
 * Interface para resultados de carregamento de loaders
 */
export interface LoaderResult {
    name: string;
    success: boolean;
    duration: number;
    details?: any;
    error?: string;
}
/**
 * Interface para definição de analizadores no sistema
 */
export interface AnalyzerModelOptions {
    /** Nome identificador do analizador */
    name: string;
    
    /** Descrição detalhada da funcionalidade do analizador */
    description: string;
}
/**
 * Configurações de inicialização de loaders
 */
export interface LoaderInitConfig {
    /**
     * Porcentagem máxima de falhas permitidas
     * @default 0.5 (50%)
     */
    maxFailureThreshold?: number;

    /**
     * Tempo máximo permitido para carregamento de todos os loaders
     * @default 30000 (30 segundos)
     */
    globalTimeout?: number;

    /**
     * Executar loaders em paralelo
     * @default true
     */
    parallel?: boolean;
}

//Interface de entrada em construção
export interface argsProps {
  input: String
}