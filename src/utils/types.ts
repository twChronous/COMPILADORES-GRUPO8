export interface ClientInterface {
  tokens: lexicTokens[];
  ast?: NoStatement[];
  analyzers: AnalyzerModelOptions[];
  errosSintaticos?: string[]; // Adicionado para armazenar erros recuperados
  LOG(...args: string[]): void;
  LOG_ERR(...args: string[]): void;
  LOG_WARN(...args: string[]): void;
  Error(...args: string[]): void;
}

export interface LoaderResult {
  name: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

export interface AnalyzerModelOptions {
  name: string;
  description: string;
}

export interface LoaderInitConfig {
  maxFailureThreshold?: number;
  globalTimeout?: number;
  parallel?: boolean;
}

export interface argsProps {
  input: String;
}

export type TokensType = "KEYWORD" | "IDENTIFICADOR" | "NUMERO" | "OPERADOR" | "EOF" | "BOOLEAN" | "STRING" | "DELIMITADOR";

export interface lexicTokens {
  tipo: TokensType;
  valor: string;
  subtipo?: string;
  linha: number;
  coluna: number;
}

export type TipoSemantico = "number" | "string" | "boolean";

// Base para todos os nós da AST (Rastreabilidade)
export interface BaseNode {
  linha: number;
  coluna: number;
}

export interface NoLiteral extends BaseNode {
  tipo: "Literal";
  tipoDado: "NUMERO" | "STRING" | "BOOLEAN";
  valor: string;
  tipoInferido?: TipoSemantico;
}

export interface NoIdentificador extends BaseNode {
  tipo: "Identificador";
  nome: string;
  tipoInferido?: TipoSemantico;
}

export interface NoExpressaoBinaria extends BaseNode {
  tipo: "ExpressaoBinaria";
  operador: string;
  esquerda: NoExpressao;
  direita: NoExpressao;
  tipoInferido?: TipoSemantico;
}

export type NoExpressao = NoLiteral | NoIdentificador | NoExpressaoBinaria;

export interface NoDeclaracaoVariavel extends BaseNode {
  tipo: "DeclaracaoVariavel";
  modificador: "let" | "const" | "var";
  nome: string;
  valorInicial: NoExpressao;
  tipoInferido?: TipoSemantico;
}

export interface NoBloco extends BaseNode {
  tipo: "Bloco";
  corpo: NoStatement[];
}

export interface NoDeclaracaoIf extends BaseNode {
  tipo: "DeclaracaoIf";
  condicao: NoExpressao;
  consequencia: NoBloco;
  alternativa: NoBloco | null;
}

export interface NoExpressaoStatement extends BaseNode {
  tipo: "ExpressaoStatement";
  expressao: NoExpressao;
}

export type NoStatement = NoDeclaracaoVariavel | NoDeclaracaoIf | NoExpressaoStatement;