import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, lexicTokens, TokensType, NoStatement, NoExpressao, NoBloco, NoDeclaracaoVariavel, NoDeclaracaoIf, NoReturnStatement, NoDeclaracaoFuncao, NoParametro, NoContinueStatement, NoBreakStatement, NoDeclaracaoWhile, NoDeclaracaoFor, NoExpressaoStatement } from "../utils/types";

/**
 * Representa um erro encontrado durante a análise sintática.
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Realiza a análise sintática do código-fonte.
 * Esta classe converte a lista de tokens em uma Árvore Sintática Abstrata (AST).
 * Ela também gerencia a precedência de operadores e recupera falhas automaticamente (Panic Mode).
 */
export default class SyntacticAnalyzer extends AnalyzerModel {
  /** Índice do token atual em processamento. */
  private atual = 0;

  /** Lista de mensagens de erro encontradas na análise. */
  private erros: string[] = [];

  /** 
   * Tabela de roteamento para instruções.
   * Redireciona a palavra-chave para a sua função de análise correspondente.
   */
  private readonly roteadorStatement: Record<string, () => NoStatement> = {
    LET: () => this.parseDeclaration(),
    CONST: () => this.parseDeclaration(),
    VAR: () => this.parseDeclaration(),
    IF: () => this.parseIf(),
    FUNCTION: () => this.parseFunctionDeclaration(), // NOVA
    RETURN: () => this.parseReturn(),
    BREAK: () => this.parseBreak(),
    CONTINUE: () => this.parseContinue(),
    WHILE: () => this.parseWhile(),
    FOR: () => this.parseFor(),
  };

  /**
   * Prepara o analisador sintático.
   * 
   * @param compiler O cliente que contém os tokens e a interface do compilador.
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Sintatico",
      description: "Análise sintática com precedência matemática e recuperação de erros."
    });
    this.client.errosSintaticos = this.erros;
  }

  /**
   * Inicia o processo de análise sintática.
   * O método lê os tokens até encontrar o final do arquivo (EOF).
   * 
   * @returns Retorna `true` se a AST for construída sem erros. Retorna `false` se houver erros.
   */
  public run(): boolean {
    const corpo: NoStatement[] = [];
    while (this.atual < this.client.tokens.length && this.espiar().tipo !== 'EOF') {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        corpo.push(stmt);
      }
    }
    this.client.ast = corpo;
    if (this.erros.length > 0) {
      this.erros.forEach(err => this.client.LOG_ERR(err));
      return false;
    }
    return true;
  }

  /**
   * Lê o token atual sem avançar o índice.
   * 
   * @returns O token na posição atual.
   */
  private espiar(): lexicTokens {
    if (this.atual >= this.client.tokens.length) {
      return this.client.tokens[this.client.tokens.length - 1];
    }
    return this.client.tokens[this.atual];
  }

  /**
   * Verifica se o token atual tem o tipo e o valor esperados.
   * 
   * @param tipo O tipo de token esperado.
   * @param valor O valor do token esperado (opcional).
   * @returns Retorna `true` se o token corresponder aos critérios.
   */
  private ehToken(tipo: TokensType, valor?: string): boolean {
    const token = this.espiar();
    return token.tipo === tipo && (valor === undefined || token.valor === valor);
  }

  /**
   * Cria e registra um erro de sintaxe.
   * 
   * @param token O token que causou o problema.
   * @param mensagem A descrição do erro.
   * @returns Uma nova exceção do tipo `ParseError`.
   */
  private erro(token: lexicTokens, mensagem: string): ParseError {
    const msg = `[Linha ${token.linha}:${token.coluna}] Erro de Sintaxe: ${mensagem}`;
    this.erros.push(msg);
    return new ParseError(msg);
  }

  /**
   * Consome o token atual se ele for igual ao esperado.
   * Se o token for diferente, o método interrompe o fluxo com um erro.
   * 
   * @param tipoEsperado O tipo do token que a gramática exige.
   * @param valorEsperado O valor do token que a gramática exige (opcional).
   * @returns O token que foi consumido.
   */
  private consumir(tipoEsperado: TokensType, valorEsperado?: string): lexicTokens {
    const token = this.espiar();
    if (token.tipo === tipoEsperado && (valorEsperado === undefined || token.valor === valorEsperado)) {
      this.atual++;
      return token;
    }
    throw this.erro(token, `Esperado '${valorEsperado || tipoEsperado}', mas encontrou '${token.valor}'`);
  }

  /**
   * Consome o token atual apenas se ele for igual ao esperado.
   * O método não gera erro se o token for diferente.
   * 
   * @param tipo O tipo de token desejado.
   * @param valor O valor do token desejado (opcional).
   */
  private consumirOpcional(tipo: TokensType, valor?: string): void {
    if (this.ehToken(tipo, valor)) {
      this.atual++;
    }
  }

  /**
   * Recupera a análise de um erro sintático (Panic Mode).
   * O método avança os tokens até encontrar um delimitador seguro (como `;` ou uma nova instrução).
   */
  private sincronizar(): void {
    this.atual++;
    while (this.atual < this.client.tokens.length && this.espiar().tipo !== 'EOF') {
      if (this.client.tokens[this.atual - 1].valor === ';') return;

      const tipo = this.espiar().tipo;
      if (tipo === 'KEYWORD' && ['LET', 'CONST', 'VAR', 'IF', 'FOR', 'WHILE', 'FUNCTION', 'RETURN'].includes(this.espiar().valor)) {
        return;
      }
      this.atual++;
    }
  }

  /**
   * Analisa um valor básico (Número, String, Booleano) ou uma sub-expressão entre parênteses.
   * 
   * @returns O nó correspondente na AST.
   */
  private parseValue(): NoExpressao {
    const token = this.espiar();
    const coordenadas = { linha: token.linha, coluna: token.coluna };

    if (token.tipo === 'NUMERO' || token.tipo === 'STRING' || token.tipo === 'BOOLEAN') {
      this.atual++;
      return { ...coordenadas, tipo: 'Literal', tipoDado: token.tipo as "NUMERO" | "STRING" | "BOOLEAN", valor: token.valor };
    }

    if (token.tipo === 'IDENTIFICADOR') {
      this.atual++;
      return { ...coordenadas, tipo: 'Identificador', nome: token.valor };
    }

    if (this.ehToken('DELIMITADOR', '(')) {
      this.consumir('DELIMITADOR', '(');
      const expr = this.parseExpression();
      this.consumir('DELIMITADOR', ')');
      return expr;
    }

    if (token.tipo === 'KEYWORD' && (token.valor === 'NULL' || token.valor === 'UNDEFINED')) {
      this.consumir('KEYWORD', token.valor);
      return {
        ...coordenadas,
        tipo: 'Literal',
        tipoDado: token.valor as "NULL" | "UNDEFINED", // Usa o valor e não o tipo
        valor: token.valor.toLowerCase() // "null" ou "undefined" minúsculos 
      };
    }

    throw this.erro(token, `Expressão inválida: token inesperado '${token.valor}'`);
  }

  /**
   * Analisa encadeamentos de acessos a membros (ex: objeto.propriedade)
   * e chamadas de função (ex: funcao(arg1, arg2)).
   */
  private parseMembroOuChamada(): NoExpressao {
    // Primeiro pega a base (ex: "console")
    let expressao = this.parseValue();

    // Fica em loop para suportar encadeamentos como "objeto.metodo().outraProp"
    while (true) {
      if (this.ehToken('DELIMITADOR', '.')) {
        this.consumir('DELIMITADOR', '.');
        const propriedade = this.consumir('IDENTIFICADOR');
        expressao = {
          tipo: 'AcessoMembro',
          objeto: expressao,
          propriedade: propriedade.valor,
          linha: propriedade.linha,
          coluna: propriedade.coluna
        };
      }
      else if (this.ehToken('DELIMITADOR', '(')) {
        const tkAbertura = this.consumir('DELIMITADOR', '(');
        const argumentos: NoExpressao[] = [];

        // Verifica se há argumentos
        if (!this.ehToken('DELIMITADOR', ')')) {
          argumentos.push(this.parseExpression());
          while (this.ehToken('DELIMITADOR', ',')) {
            this.consumir('DELIMITADOR', ',');
            argumentos.push(this.parseExpression());
          }
        }

        this.consumir('DELIMITADOR', ')');
        expressao = {
          tipo: 'ChamadaFuncao',
          callee: expressao,
          argumentos,
          linha: tkAbertura.linha,
          coluna: tkAbertura.coluna
        };
      }
      else {
        break; // Não é acesso de membro nem função, sai do loop
      }
    }

    return expressao;
  }

  /**
   * Analisa a precedência de multiplicação, divisão e módulo.
   * @returns O nó com a operação matemática estruturada.
   */
  private parseFator(): NoExpressao {
    let esquerda = this.parseMembroOuChamada();

    while (this.ehToken('OPERADOR', '*') || this.ehToken('OPERADOR', '/') || this.ehToken('OPERADOR', '%')) {
      const operador = this.consumir('OPERADOR');
      const direita = this.parseMembroOuChamada();
      esquerda = { tipo: 'ExpressaoBinaria', operador: operador.valor, esquerda, direita, linha: operador.linha, coluna: operador.coluna };
    }

    return esquerda;
  }

  /**
   * Analisa a precedência de adição e subtração.
   * 
   * @returns O nó com a operação matemática estruturada.
   */
  private parseTermo(): NoExpressao {
    let esquerda = this.parseFator();

    while (this.ehToken('OPERADOR', '+') || this.ehToken('OPERADOR', '-')) {
      const operador = this.consumir('OPERADOR');
      const direita = this.parseFator();
      esquerda = { tipo: 'ExpressaoBinaria', operador: operador.valor, esquerda, direita, linha: operador.linha, coluna: operador.coluna };
    }

    return esquerda;
  }

  /**
   * Analisa um nível de precedência de operadores binários associativos à esquerda.
   *
   * O método é genérico: cada nível de precedência (relacional, igualdade, `&&`, `||`)
   * só informa quais operadores aceita e qual é o nível imediatamente superior.
   * Assim, `a - b - c` e `a && b && c` são agrupados como `((a - b) - c)` e `((a && b) && c)`.
   *
   * @param ops Operadores aceitos neste nível (ex.: `['==', '!=']`).
   * @param proximo Função que analisa o nível de precedência imediatamente superior.
   * @returns O nó `ExpressaoBinaria` encadeado à esquerda, ou o próprio operando se não houver operador.
   * @throws {ParseError} Se faltar o operando da direita após um operador.
   */
  private parseBinarioEsq(ops: string[], proximo: () => NoExpressao): NoExpressao {
    let esquerda = proximo();
    while (ops.some(op => this.ehToken('OPERADOR', op))) {
      const operador = this.consumir('OPERADOR');
      const direita = proximo();
      esquerda = { tipo: 'ExpressaoBinaria', operador: operador.valor, esquerda, direita, linha: operador.linha, coluna: operador.coluna };
    }
    return esquerda;
  }

  /**
   * Analisa operadores relacionais (`>`, `<`, `>=`, `<=`).
   * Seus operandos são expressões aritméticas (ver `parseTermo`).
   *
   * @returns O nó relacional, ou o operando aritmético se não houver operador relacional.
   */
  private parseRelacional(): NoExpressao {
    return this.parseBinarioEsq(['>', '<', '>=', '<='], () => this.parseTermo());
  }

  /**
   * Analisa operadores de igualdade (`==`, `!=`).
   * Tem precedência menor que a dos relacionais: `a == b < c` equivale a `a == (b < c)`.
   *
   * @returns O nó de igualdade, ou o operando relacional se não houver operador de igualdade.
   */
  private parseIgualdade(): NoExpressao {
    return this.parseBinarioEsq(['==', '!='], () => this.parseRelacional());
  }

  /**
   * Analisa o operador lógico E (`&&`).
   * Tem precedência menor que a da igualdade e maior que a do `||`:
   * `a || b && c` equivale a `a || (b && c)`.
   *
   * @returns O nó `&&`, ou o operando de igualdade se não houver `&&`.
   */
  private parseE(): NoExpressao {
    return this.parseBinarioEsq(['&&'], () => this.parseIgualdade());
  }

  /**
   * Analisa o operador lógico OU (`||`), o de menor precedência entre os operadores binários.
   *
   * @returns O nó `||`, ou o operando `&&` se não houver `||`.
   */
  private parseOu(): NoExpressao {
    return this.parseBinarioEsq(['||'], () => this.parseE());
  }

  /**
   * Ponto de entrada para operadores relacionais, de igualdade e lógicos.
   *
   * Percorre a cadeia de precedência, da menor para a maior:
   * `||` → `&&` → `==`/`!=` → `>`/`<`/`>=`/`<=` → `+`/`-`.
   * É chamado por `parseExpression`, que ainda trata as atribuições.
   *
   * @returns O nó principal da expressão, sem atribuição.
   */
  private parseComparacao(): NoExpressao {
    return this.parseOu();
  }

  /**
   * Analisa a expressão completa, incluindo as atribuições da direita para a esquerda.
   * 
   * @returns O nó principal da expressão na AST.
   */
  private parseExpression(): NoExpressao {
    let esquerda = this.parseComparacao();

    if (this.ehToken('OPERADOR', '=') || this.ehToken('OPERADOR', '+=') || this.ehToken('OPERADOR', '-=')) {
      const operador = this.consumir('OPERADOR');
      const direita = this.parseExpression();
      return { tipo: 'ExpressaoBinaria', operador: operador.valor, esquerda, direita, linha: operador.linha, coluna: operador.coluna };
    }

    return esquerda;
  }

  /**
   * Analisa uma declaração de variável.
   *
   * @param exigirPontoEVirgula Se `true`, o `;` final é obrigatório (usado na inicialização do `for`).
   * @returns O nó de declaração na AST.
   */
  private parseDeclaration(exigirPontoEVirgula = false): NoDeclaracaoVariavel {
    const tkKeyword = this.consumir('KEYWORD');
    const identificador = this.consumir('IDENTIFICADOR');

    this.consumir('OPERADOR', '=');
    const valorInicial = this.parseExpression();
    if (exigirPontoEVirgula) {
      this.consumir('DELIMITADOR', ';');
    } else {
      this.consumirOpcional('DELIMITADOR', ';');
    }

    return {
      tipo: 'DeclaracaoVariavel',
      modificador: tkKeyword.valor.toLowerCase() as "let" | "const" | "var",
      nome: identificador.valor,
      valorInicial,
      linha: tkKeyword.linha,
      coluna: tkKeyword.coluna
    };
  }

  /**
   * Analisa um bloco de código contido entre chaves.
   * 
   * @returns O nó de bloco com seus comandos filhos.
   */
  private parseBloco(): NoBloco {
    const tk = this.consumir('DELIMITADOR', '{');
    const corpo: NoStatement[] = [];

    while (!this.ehToken('DELIMITADOR', '}') && this.espiar().tipo !== 'EOF') {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        corpo.push(stmt);
      }
    }

    this.consumir('DELIMITADOR', '}');
    return { tipo: 'Bloco', corpo, linha: tk.linha, coluna: tk.coluna };
  }

  /**
   * Analisa uma estrutura condicional if/else.
   * 
   * @returns O nó condicional estruturado na AST.
   */
  private parseIf(): NoDeclaracaoIf {
    const tk = this.consumir('KEYWORD', 'IF');

    this.consumir('DELIMITADOR', '(');
    const condicao = this.parseExpression();
    this.consumir('DELIMITADOR', ')');

    const consequencia = this.parseBloco();

    const alternativa = this.ehToken('KEYWORD', 'ELSE')
      ? (this.consumir('KEYWORD', 'ELSE'), this.parseBloco())
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
   * Roteia o comando atual para a função de análise correta.
   * Caso ocorra um erro de sintaxe, o método captura a exceção e inicia o processo de recuperação.
   * 
   * @returns O nó validado ou `null` se houver erro recuperado.
   */
  private parseStatement(): NoStatement | null {
    try {
      const token = this.espiar();

      if (token.tipo === 'KEYWORD') {
        const parser = this.roteadorStatement[token.valor];
        if (parser) {
          return parser();
        }
      }

      const expressao = this.parseExpression();
      this.consumirOpcional('DELIMITADOR', ';');

      return {
        tipo: 'ExpressaoStatement',
        expressao,
        linha: token.linha,
        coluna: token.coluna
      };
    } catch (e) {
      if (e instanceof ParseError) {
        this.sincronizar();
        return null;
      }
      throw e;
    }
  }
  /**
   * Analisa a declaração de uma função e seus parâmetros.
   */
  private parseFunctionDeclaration(): NoDeclaracaoFuncao {
    const tkKeyword = this.consumir('KEYWORD', 'FUNCTION');
    const tkNome = this.consumir('IDENTIFICADOR');

    this.consumir('DELIMITADOR', '(');
    const parametros: NoParametro[] = [];

    // Processa os parâmetros separados por vírgula
    if (!this.ehToken('DELIMITADOR', ')')) {
      const param = this.consumir('IDENTIFICADOR');
      parametros.push({ tipo: "Parametro", nome: param.valor, linha: param.linha, coluna: param.coluna });

      while (this.ehToken('DELIMITADOR', ',')) {
        this.consumir('DELIMITADOR', ',');
        const proxParam = this.consumir('IDENTIFICADOR');
        parametros.push({ tipo: "Parametro", nome: proxParam.valor, linha: proxParam.linha, coluna: proxParam.coluna });
      }
    }

    this.consumir('DELIMITADOR', ')');

    // O corpo da função é apenas um bloco comum
    const corpo = this.parseBloco();

    return {
      tipo: 'DeclaracaoFuncao',
      nome: tkNome.valor,
      parametros,
      corpo,
      linha: tkKeyword.linha,
      coluna: tkKeyword.coluna
    };
  }

  /**
   * Analisa a instrução de retorno (podendo ser vazia).
   */
  private parseReturn(): NoReturnStatement {
    const tk = this.consumir('KEYWORD', 'RETURN');
    let argumento: NoExpressao | null = null;

    // Se não houver ; ou } imediatamente, significa que há um valor sendo retornado
    if (!this.ehToken('DELIMITADOR', ';') && !this.ehToken('DELIMITADOR', '}')) {
      argumento = this.parseExpression();
    }

    this.consumirOpcional('DELIMITADOR', ';');

    return {
      tipo: 'ReturnStatement',
      argumento,
      linha: tk.linha,
      coluna: tk.coluna
    };
  }
  /**
 * Analisa a instrução de salto de iteração (continue).
 */
  private parseContinue(): NoContinueStatement {
    const tk = this.consumir('KEYWORD', 'CONTINUE');

    this.consumirOpcional('DELIMITADOR', ';');

    return {
      tipo: 'ContinueStatement',
      linha: tk.linha,
      coluna: tk.coluna
    };
  }
  /**
   * Analisa a instrução de interrupção de laço (break).
   */
  private parseBreak(): NoBreakStatement {
    const tk = this.consumir('KEYWORD', 'BREAK');

    this.consumirOpcional('DELIMITADOR', ';');

    return {
      tipo: 'BreakStatement',
      linha: tk.linha,
      coluna: tk.coluna
    };
  }
  /**
   * Analisa um laço de repetição (while).
   */
  private parseWhile(): NoDeclaracaoWhile {
    const tkKeyword = this.consumir('KEYWORD', 'WHILE');

    this.consumir('DELIMITADOR', '(');
    const condicao = this.parseExpression();
    this.consumir('DELIMITADOR', ')');

    const corpo = this.parseBloco();

    return {
      tipo: 'DeclaracaoWhile',
      condicao,
      corpo,
      linha: tkKeyword.linha,
      coluna: tkKeyword.coluna
    };
  }

  /**
   * Analisa o laço `for` clássico: `for (inicialização; condição; atualização) { ... }`.
   * Cada uma das três partes pode ser omitida (ex: `for (;;) { ... }`).
   *
   * @returns O nó `DeclaracaoFor` na AST.
   */
  private parseFor(): NoDeclaracaoFor {
    const tkKeyword = this.consumir('KEYWORD', 'FOR');
    this.consumir('DELIMITADOR', '(');

    // 1. Inicialização: declaração, expressão ou vazia
    let inicializacao: NoDeclaracaoVariavel | NoExpressaoStatement | null = null;
    if (this.ehToken('DELIMITADOR', ';')) {
      this.consumir('DELIMITADOR', ';');
    } else if (
      this.ehToken('KEYWORD', 'LET') ||
      this.ehToken('KEYWORD', 'CONST') ||
      this.ehToken('KEYWORD', 'VAR')
    ) {
      inicializacao = this.parseDeclaration(true);
    } else {
      const tkInicio = this.espiar();
      const expressao = this.parseExpression();
      this.consumir('DELIMITADOR', ';');
      inicializacao = {
        tipo: 'ExpressaoStatement',
        expressao,
        linha: tkInicio.linha,
        coluna: tkInicio.coluna
      };
    }

    // 2. Condição (opcional)
    let condicao: NoExpressao | null = null;
    if (!this.ehToken('DELIMITADOR', ';')) {
      condicao = this.parseExpression();
    }
    this.consumir('DELIMITADOR', ';');

    // 3. Atualização (opcional)
    let atualizacao: NoExpressao | null = null;
    if (!this.ehToken('DELIMITADOR', ')')) {
      atualizacao = this.parseExpression();
    }
    this.consumir('DELIMITADOR', ')');

    const corpo = this.parseBloco();

    return {
      tipo: 'DeclaracaoFor',
      inicializacao,
      condicao,
      atualizacao,
      corpo,
      linha: tkKeyword.linha,
      coluna: tkKeyword.coluna
    };
  }
}