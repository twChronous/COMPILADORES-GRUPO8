/**
 * Interface de cliente para gerenciamento de aplicação
 * Fornece acesso a recursos e utilitários do sistema
 */
export interface ClientInterface {
    tokens: lexicTokens[];
    /** Programa produzido pelo analisador sintático e anotado pelo semântico. */
    ast?: NoStatement[];
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

/**
 * Tokens gerados pela analise léxica
 */
export interface lexicTokens {
  tipo: TokensType,
  valor: string,
  subtipo?: string;
}
/**
 * Possiveis tipos de tokens gerados pela analise léxica
 */
export type TokensType = "KEYWORD" | "IDENTIFICADOR" | "NUMERO" | "OPERADOR" | "EOF" | "BOOLEAN" | "STRING" | "DELIMITADOR"

/** Tipos de dados do subconjunto já reconhecido pelo analisador sintático. */
export type TipoSemantico = "number" | "string" | "boolean";

export interface NoLiteral {
  tipo: "Literal";
  tipoDado: "NUMERO" | "STRING" | "BOOLEAN";
  valor: string;
  tipoInferido?: TipoSemantico;
}

export interface NoIdentificador {
  tipo: "Identificador";
  nome: string;
  tipoInferido?: TipoSemantico;
}

export interface NoExpressaoBinaria {
  tipo: "ExpressaoBinaria";
  operador: string;
  esquerda: NoExpressao;
  direita: NoExpressao;
  tipoInferido?: TipoSemantico;
}

export type NoExpressao = NoLiteral | NoIdentificador | NoExpressaoBinaria;

export interface NoDeclaracaoVariavel {
  tipo: "DeclaracaoVariavel";
  modificador: "let" | "const" | "var";
  nome: string;
  valorInicial: NoExpressao;
  tipoInferido?: TipoSemantico;
}

export interface NoBloco {
  tipo: "Bloco";
  corpo: NoStatement[];
}

export interface NoDeclaracaoIf {
  tipo: "DeclaracaoIf";
  condicao: NoExpressao;
  consequencia: NoBloco;
  alternativa: NoBloco | null;
}

export interface NoExpressaoStatement {
  tipo: "ExpressaoStatement";
  expressao: NoExpressao;
}

export type NoStatement = NoDeclaracaoVariavel | NoDeclaracaoIf | NoExpressaoStatement;