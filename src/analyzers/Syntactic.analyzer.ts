import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, lexicTokens, NoStatement, TokensType } from "../utils/types";

/**
 * Representa um erro ocorrido durante a análise sintática.
 */
class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Analisa a sintaxe do código-fonte utilizando uma abordagem preditiva (Top-Down).
 * Esta classe converte a lista de tokens em uma Árvore Sintática Abstrata (AST) e lida com a recuperação de erros.
 */
export default class SyntacticAnalyzer extends AnalyzerModel {
  /** O índice do token que está sendo analisado no momento. */
  private atual = 0;
  
  /** Armazena a lista de erros de sintaxe encontrados. */
  private erros: string[] = [];
  
  /** 
   * Mapeia as palavras-chave para suas respectivas funções de análise.
   * Isso elimina a necessidade de longas estruturas if/else.
   */
  private readonly roteadorStatement: Record<string, () => any> = {
    LET: () => this.parseDeclaration(),
    CONST: () => this.parseDeclaration(),
    VAR: () => this.parseDeclaration(),
    IF: () => this.parseIf()
  };

  /**
   * Inicializa o analisador sintático.
   * 
   * @param compiler A interface do cliente do compilador, contendo os tokens e métodos de log.
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Sintatico",
      description: "Analise sintática do compilador"
    });
  }

  /**
   * Inicia o processo de análise sintática.
   * Lê tokens até encontrar o final do arquivo (EOF) e constrói a AST.
   * Se erros forem encontrados, eles serão registrados no sistema de logs.
   * 
   * @returns Retorna `true` se a árvore foi construída sem erros, caso contrário, `false`.
   */
  public run(): boolean {
    const corpo: NoStatement[] = [];
    while (this.espiar().tipo !== 'EOF') {
      const stmt = this.parseStatement();
      if (stmt) corpo.push(stmt);
    }
    this.client.ast = corpo;
    
    if (this.erros.length > 0) {
      this.erros.forEach(err => this.client.LOG_ERR(err));
      return false;
    }
    return true;
  }

  /**
   * Retorna o token atual sem consumi-lo (sem avançar o índice).
   * 
   * @returns O token na posição atual.
   */
  private espiar(): lexicTokens {
    return this.client.tokens[this.atual];
  }

  /**
   * Verifica se o token atual corresponde ao tipo e valor especificados.
   * 
   * @param tipo O tipo de token esperado.
   * @param valor O valor do token esperado (opcional).
   * @returns Retorna `true` se o token coincidir; caso contrário, `false`.
   */
  private ehToken(tipo: TokensType, valor?: any): boolean {
    const token = this.espiar();
    return token.tipo === tipo && (valor === undefined || token.valor === valor);
  }

  /**
   * Registra e cria uma instância de ParseError.
   * 
   * @param token O token problemático para registrar a localização (linha/coluna).
   * @param mensagem A mensagem detalhando o erro.
   * @returns A exceção ParseError recém-criada.
   */
  private erro(token: lexicTokens, mensagem: string): ParseError {
    const msg = `[Linha ${token.linha}:${token.coluna}] Erro de Sintaxe: ${mensagem}`;
    this.erros.push(msg);
    return new ParseError(msg);
  }

  /**
   * Tenta consumir o token atual se ele corresponder aos critérios.
   * Se o token atual não corresponder, a função registrará um erro.
   * 
   * @param tipoEsperado O tipo de token que a gramática espera.
   * @param valorEsperado O valor do token que a gramática espera (opcional).
   * @returns O token consumido.
   * @throws Um `ParseError` se o token não for o esperado.
   */
  private consumir(tipoEsperado: TokensType, valorEsperado?: any): lexicTokens {
    const token = this.espiar();
    const valido = token.tipo === tipoEsperado && (valorEsperado === undefined || token.valor === valorEsperado);

    if (!valido) {
      throw this.erro(token, `Esperado tipo '${tipoEsperado}'${valorEsperado ? ` com valor '${valorEsperado}'` : ''}, mas encontrou tipo '${token.tipo}' com valor '${token.valor}'`);
    }

    this.atual++;
    return token;
  }

  /**
   * Consome o token atual apenas se ele corresponder aos critérios fornecidos, mas não gera erro caso contrário.
   * Usado para elementos opcionais na sintaxe, como o `;`.
   * 
   * @param tipo O tipo de token desejado.
   * @param valor O valor do token desejado (opcional).
   */
  private consumirOpcional(tipo: TokensType, valor?: any): void {
    if (this.ehToken(tipo, valor)) {
      this.atual++;
    }
  }

  /**
   * Recupera o analisador de um estado de erro avançando tokens de forma segura.
   * A sincronização busca pelo próximo ponto de encerramento, como um `;` ou o início de uma nova declaração.
   */
  private sincronizar(): void {
    this.atual++;
    while (this.espiar().tipo !== 'EOF') {
      if (this.client.tokens[this.atual - 1].valor === ';') return;
      const tipo = this.espiar().tipo;
      if (tipo === 'KEYWORD' && ['LET', 'CONST', 'VAR', 'IF'].includes(this.espiar().valor)) return;
      this.atual++;
    }
  }

  /**
   * Analisa um valor literal (Número, String, Booleano) ou um Identificador.
   * 
   * @returns O nó da AST correspondente ao valor.
   * @throws Lança um `ParseError` se o token não representar um valor válido.
   */
  private parseValue() {
    const token = this.espiar();
    const coordenadas = { linha: token.linha, coluna: token.coluna };

    const construtores: Partial<Record<TokensType, () => any>> = {
      NUMERO: () => ({ ...coordenadas, tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      STRING: () => ({ ...coordenadas, tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      BOOLEAN: () => ({ ...coordenadas, tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      IDENTIFICADOR: () => ({ ...coordenadas, tipo: 'Identificador', nome: token.valor })
    };

    const criarNo = construtores[token.tipo];
    if (!criarNo) {
      throw this.erro(token, `Expressão inválida: token inesperado '${token.valor}'`);
    }

    this.atual++;
    return criarNo();
  }

  /**
   * Analisa expressões matemáticas e lógicas, agrupando-as na AST.
   * O código constrói uma árvore com os operadores mantendo a relação entre os lados esquerdo e direito.
   * 
   * @returns O nó da árvore com a expressão estruturada.
   */
  private parseExpression() {
    let esquerda = this.parseValue();

    while (this.ehToken('OPERADOR')) {
      const operador = this.consumir('OPERADOR');
      const direita = this.parseValue();

      esquerda = {
        tipo: 'ExpressaoBinaria',
        operador: operador.valor,
        esquerda,
        direita,
        linha: operador.linha, 
        coluna: operador.coluna
      };
    }

    return esquerda;
  }

  /**
   * Analisa uma declaração de variável (let, const, var).
   * O método consome o nome, a atribuição, o valor inicial e o ponto-e-vírgula opcional.
   * 
   * @returns O nó da árvore com os dados da declaração.
   */
  private parseDeclaration() {
    const tkKeyword = this.consumir('KEYWORD');
    const identificador = this.consumir('IDENTIFICADOR');
    this.consumir('OPERADOR', '=');
    const valorInicial = this.parseExpression();
    this.consumirOpcional('DELIMITADOR', ';');

    return {
      tipo: 'DeclaracaoVariavel',
      modificador: tkKeyword.valor.toLowerCase(),
      nome: identificador.valor,
      valorInicial,
      linha: tkKeyword.linha,
      coluna: tkKeyword.coluna
    };
  }

  /**
   * Analisa um bloco de código aninhado (delimitado por `{ }`).
   * 
   * @returns O nó da árvore representando o bloco e seus statements filhos.
   */
  private parseBloco() {
    const tk = this.consumir('DELIMITADOR', '{');
    const corpo = [];

    while (!this.ehToken('DELIMITADOR', '}') && this.espiar().tipo !== 'EOF') {
      const stmt = this.parseStatement();
      if (stmt) {
        corpo.push(stmt);
      }
    }

    this.consumir('DELIMITADOR', '}');
    return { tipo: 'Bloco', corpo, linha: tk.linha, coluna: tk.coluna };
  }

  /**
   * Analisa uma declaração condicional (if/else).
   * Processa a condição em parênteses e executa a verificação dos blocos de consequência e alternativa.
   * 
   * @returns O nó da AST para a declaração condicional.
   */
  private parseIf() {
    const tk = this.consumir('KEYWORD', 'IF');
    this.consumir('DELIMITADOR', '(');
    const condicao = this.parseExpression();
    this.consumir('DELIMITADOR', ')');

    const consequencia = this.parseBloco();

    const alternativa = this.ehToken('KEYWORD', 'ELSE')
      ? this.parseBlocoElse()
      : null;

    return {
      tipo: 'DeclaracaoIf',
      condicao,
      consequencia,
      alternativa,
      linha: tk.linha, 
      coluna: tk.coluna
    };
  }

  /**
   * Analisa o bloco `else` de uma estrutura condicional.
   * 
   * @returns O nó de bloco com as instruções do fallback.
   */
  private parseBlocoElse() {
    this.consumir('KEYWORD', 'ELSE');
    return this.parseBloco();
  }

  /**
   * Redireciona a análise para a função correta dependendo do primeiro token encontrado na instrução atual.
   * Caso encontre um erro na instrução, utiliza a sincronização para permitir a continuação da análise.
   * 
   * @returns O nó do comando estruturado na AST ou `null` caso a análise precise se recuperar de um erro.
   */
  private parseStatement(): NoStatement | null {
    try {
      const token = this.espiar();
      if (token.tipo === 'KEYWORD') {
        const parser = this.roteadorStatement[token.valor];
        if (parser) return parser();
      }
      
      const expressao = this.parseExpression();
      this.consumirOpcional('DELIMITADOR', ';');
      return { tipo: 'ExpressaoStatement', expressao, linha: token.linha, coluna: token.coluna };
    } catch (e) {
      if (e instanceof ParseError) {
        this.sincronizar();
        return null;
      }
      throw e;
    }
  }
}