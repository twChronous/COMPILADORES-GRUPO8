export interface ClientInterface {
  tokens: lexicTokens[];
  analyzers: AnalyzerModelOptions[];
  ast?: NoStatement[];
  tabelaSimbolos?: Simbolo[];
  errosSintaticos?: string[];
  LOG(...args: string[]): void;
  LOG_ERR(...args: string[]): void;
  LOG_WARN(...args: string[]): void;
  Error(...args: string[]): void;
}

export interface Simbolo {
  nome: string;
  modificador: "let" | "const" | "var";
  tipo: TipoSemantico;
  linhaDeclaracao: number;
  escopo: string;
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

export type TokensType =
  | "KEYWORD"
  | "IDENTIFICADOR"
  | "NUMERO"
  | "OPERADOR"
  | "EOF"
  | "BOOLEAN"
  | "STRING"
  | "DELIMITADOR";

export interface lexicTokens {
  tipo: TokensType;
  valor: string;
  subtipo?: string;
  linha: number;
  coluna: number;
}

export type TipoSemantico =
  | "number"
  | "string"
  | "boolean"
  | "any"
  | "void"
  | "object"
  | "undefined"
  | "null"
  | "function";

// Base para todos os nós da AST (Rastreabilidade).
export interface BaseNode {
  linha: number;
  coluna: number;
}

export interface NoLiteral extends BaseNode {
  tipo: "Literal";
  tipoDado: "NUMERO" | "STRING" | "BOOLEAN" | "NULL" | "UNDEFINED";
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

export interface NoAcessoMembro extends BaseNode {
  tipo: "AcessoMembro";
  objeto: NoExpressao;
  propriedade: string;
  tipoInferido?: TipoSemantico;
}

export interface NoChamadaFuncao extends BaseNode {
  tipo: "ChamadaFuncao";
  callee: NoExpressao;
  argumentos: NoExpressao[];
  tipoInferido?: TipoSemantico;
}

export type NoExpressao =
  | NoLiteral
  | NoIdentificador
  | NoExpressaoBinaria
  | NoAcessoMembro
  | NoChamadaFuncao;

export interface NoExpressaoStatement extends BaseNode {
  tipo: "ExpressaoStatement";
  expressao: NoExpressao;
}
export interface NoParametro extends BaseNode {
  tipo: "Parametro";
  nome: string;
}

export interface NoDeclaracaoFuncao extends BaseNode {
  tipo: "DeclaracaoFuncao";
  nome: string;
  parametros: NoParametro[];
  corpo: NoBloco;
}

export interface NoDeclaracaoWhile extends BaseNode {
  tipo: "DeclaracaoWhile";
  condicao: NoExpressao;
  corpo: NoBloco;
}

export interface NoReturnStatement extends BaseNode {
  tipo: "ReturnStatement";
  argumento: NoExpressao | null;
  tipoInferido?: TipoSemantico;
}
export interface NoBreakStatement extends BaseNode {
  tipo: "BreakStatement";
}
export interface NoContinueStatement extends BaseNode {
  tipo: "ContinueStatement";
}

export type NoStatement = 
  | NoDeclaracaoVariavel 
  | NoDeclaracaoIf 
  | NoExpressaoStatement 
  | NoBloco
  | NoDeclaracaoFuncao 
  | NoReturnStatement
  | NoBreakStatement
  | NoContinueStatement
  | NoDeclaracaoWhile;