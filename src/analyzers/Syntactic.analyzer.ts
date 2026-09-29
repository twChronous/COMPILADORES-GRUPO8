import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, lexicTokens, TokensType } from "../utils/types";

export default class SyntacticAnalyzer extends AnalyzerModel {
  private atual = 0;

  // Tabela de despacho: cada KEYWORD aponta direto para o parser responsável.
  // Substitui a cadeia de ifs (LET/CONST/VAR/IF) por uma única busca em objeto.
  private readonly roteadorStatement: Record<string, () => any> = {
    LET: () => this.parseDeclaration(),
    CONST: () => this.parseDeclaration(),
    VAR: () => this.parseDeclaration(),
    IF: () => this.parseIf()
  };

  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Sintatico",
      description: "Analise sintática do compilador"
    })
  }

  /**
   * Analise Sintática do compilador
   * 
   * @method run
   * @public
   * @description faz a analise sintática
   * @returns {void}
   */
  public run(): boolean {
    const corpo = [];
    while (this.espiar().tipo !== 'EOF') {
      corpo.push(this.parseStatement());
    }
    console.log(corpo);
    return true;
  }

  private espiar(): lexicTokens {
    return this.client.tokens[this.atual];
  }

  /**
   * Verifica o token atual sem consumi-lo (usado para substituir vários
   * "if (this.espiar().tipo === X && this.espiar().valor === Y)" espalhados pelo código)
   */
  private ehToken(tipo: TokensType, valor?: any): boolean {
    const token = this.espiar();
    return token.tipo === tipo && (valor === undefined || token.valor === valor);
  }

  private consumir(tipoEsperado: TokensType, valorEsperado?: any): lexicTokens {
    const token = this.espiar();
    const valido = token.tipo === tipoEsperado && (valorEsperado === undefined || token.valor === valorEsperado);

    if (!valido) {
      throw new Error(
        `Erro de Sintaxe: Esperado tipo '${tipoEsperado}'${valorEsperado ? ` com valor '${valorEsperado}'` : ''}, ` +
        `mas encontrou tipo '${token.tipo}' com valor '${token.valor}' na posição ${this.atual}`
      );
    }

    this.atual++;
    return token;
  }

  /**
   * Consome o token somente se ele existir (ex: ';' opcional ao fim de uma declaração)
   */
  private consumirOpcional(tipo: TokensType, valor?: any): void {
    if (this.ehToken(tipo, valor)) {
      this.consumir(tipo, valor);
    }
  }

  // Regra base: Valores literais e Variáveis
  private parseValue() {
    const token = this.espiar();

    // Tabela de despacho por tipo de token: elimina o if/if encadeado original
    const construtores: Partial<Record<TokensType, () => any>> = {
      NUMERO: () => ({ tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      STRING: () => ({ tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      BOOLEAN: () => ({ tipo: 'Literal', tipoDado: token.tipo, valor: token.valor }),
      IDENTIFICADOR: () => ({ tipo: 'Identificador', nome: token.valor })
    };

    const criarNo = construtores[token.tipo];
    if (!criarNo) {
      throw new Error(`Expressão inválida: token inesperado '${token.valor}'`);
    }

    this.atual++;
    return criarNo();
  }

  private parseExpression() {
      // 1. Trocamos const por let para podermos agrupar os nós
      let esquerda = this.parseValue();

      // 2. Trocamos o 'if' por 'while' para encadear múltiplas operações
      while (this.ehToken('OPERADOR')) {
        const operador = this.consumir('OPERADOR');
        const direita = this.parseValue();

        // Transforma a árvore atual no lado esquerdo da nova operação
        esquerda = {
          tipo: 'ExpressaoBinaria',
          operador: operador.valor,
          esquerda,
          direita
        };
      }

      return esquerda;
    }

  // Regra: Declaração de variável (let / const / var)
  private parseDeclaration() {
    // Consome a keyword (LET, CONST ou VAR)
    const tipoDeclaracao = this.consumir('KEYWORD').valor;

    const identificador = this.consumir('IDENTIFICADOR');
    this.consumir('OPERADOR', '=');
    const valorInicial = this.parseExpression();

    // ponto-e-vírgula é opcional
    this.consumirOpcional('DELIMITADOR', ';');

    return {
      tipo: 'DeclaracaoVariavel',
      modificador: tipoDeclaracao.toLowerCase(), // let, const, var
      nome: identificador.valor,
      valorInicial
    };
  }

  // Regra: Bloco de código delimitado por chaves { }
  private parseBloco() {
    this.consumir('DELIMITADOR', '{');
    const corpo = [];

    while (!this.ehToken('DELIMITADOR', '}')) {
      corpo.push(this.parseStatement());
    }

    this.consumir('DELIMITADOR', '}');
    return { tipo: 'Bloco', corpo };
  }

  // Regra: Estrutura Condicional (If / Else)
  private parseIf() {
    this.consumir('KEYWORD', 'IF');
    this.consumir('DELIMITADOR', '(');
    const condicao = this.parseExpression();
    this.consumir('DELIMITADOR', ')');

    const consequencia = this.parseBloco();

    // ternário no lugar do if/else para a alternativa opcional
    const alternativa = this.ehToken('KEYWORD', 'ELSE')
      ? this.parseBlocoElse()
      : null;

    return {
      tipo: 'DeclaracaoIf',
      condicao,
      consequencia,
      alternativa
    };
  }

  private parseBlocoElse() {
    this.consumir('KEYWORD', 'ELSE');
    return this.parseBloco();
  }

// Roteador de Statements: Decide o que fazer com base na palavra-chave
  private parseStatement(): any {
    const token = this.espiar();

    // Se for uma KEYWORD, delega para o roteador de statements
    if (token.tipo === 'KEYWORD') {
      const chave = token.valor;
      const parser = this.roteadorStatement[chave];

      if (parser) {
        return parser();
      }
    }

    // FALLBACK: Se a linha não começar com KEYWORD, tenta processar como uma expressão livre 
    // (Útil para reatribuição de variáveis como `x = 10;` ou chamadas de função)
    if (token.tipo === 'IDENTIFICADOR' || token.tipo === 'NUMERO' || token.tipo === 'STRING') {
       const expressao = this.parseExpression();
       this.consumirOpcional('DELIMITADOR', ';');
       
       return {
         tipo: 'ExpressaoStatement',
         expressao
       };
    }

    throw new Error(`Statement não suportado ou token inesperado: ${token.valor}`);
  }
}