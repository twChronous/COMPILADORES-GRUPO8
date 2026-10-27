import AnalyzerModel from "../models/Analyzer.model";
import {
  ClientInterface,
  NoBloco,
  NoDeclaracaoIf,
  NoDeclaracaoVariavel,
  NoExpressao,
  NoExpressaoBinaria,
  NoExpressaoStatement,
  NoStatement,
  TipoSemantico,
  Simbolo
} from "../utils/types";


const OPERADORES_ATRIBUICAO = new Set(["=", "+=", "-="]);
const OPERADORES_ARITMETICOS = new Set(["-", "*", "/", "%"]);
const OPERADORES_RELACIONAIS = new Set([">", "<", ">=", "<="]);
const OPERADORES_IGUALDADE = new Set(["==", "!="]);
const OPERADORES_LOGICOS = new Set(["&&", "||"]);

/**
 * Analisa a semântica do código-fonte. 
 * Esta classe verifica os tipos de dados, as declarações de variáveis e as regras de escopo.
 */
export default class SemanticalAnalyzer extends AnalyzerModel {
  /**
   * Armazena a pilha de escopos do programa.
   * O índice 0 sempre representa o escopo global.
   */
  private escopos: Map<string, Simbolo>[] = [];
  private registroSimbolos: Simbolo[] = [];
  private contadorEscopo = 0;

  /**
   * Inicializa o analisador semântico.
   * 
   * @param compiler O cliente do compilador que contém a árvore sintática (AST).
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Semantico",
      description: "Análise semântica com verificação rígida de tipos e escopos."
    });
  }

  /**
   * Executa a análise semântica na árvore sintática (AST).
   * O método verifica a árvore gerada pelo analisador sintático. Se a árvore não existir, o método registra um erro.
   *
   * @returns Retorna `true` se a análise terminar sem erros. Retorna `false` se ocorrer um erro.
   */
  public run(): boolean {
    if (!this.client.ast) {
      this.client.LOG_ERR("Erro Semântico: AST ausente. Execute o analisador sintático antes.");
      return false;
    }

    try {
      this.client.ast = this.analisar(this.client.ast);
      return true;
    } catch (error: any) {
      this.client.LOG_ERR(error.message);
      return false;
    } finally {
       this.client.tabelaSimbolos = this.registroSimbolos
    }
  }

  /**
   * Inicia a análise da árvore sintática a partir do escopo global.
   * Este método percorre todos os comandos do programa para aplicar as regras semânticas.
   * 
   * @param corpo A lista de comandos (statements) da AST.
   * @returns A lista de comandos anotados com seus tipos inferidos.
   */
  public analisar(corpo: NoStatement[]): NoStatement[] {
    this.escopos = [new Map()]; // Inicializa o escopo global
    this.registroSimbolos = [];
    this.contadorEscopo = 0;
    return corpo.map((statement) => this.verificarStatement(statement));
  }

  /**
   * Verifica um único comando e o direciona para a função de validação correta.
   * 
   * @param no O nó do comando a ser verificado.
   * @returns O nó analisado e tipado.
   * @throws Lança um erro se o tipo do comando não for suportado.
   */
  private verificarStatement(no: NoStatement): NoStatement {
    if (no.tipo === "DeclaracaoVariavel") return this.verificarDeclaracao(no);
    if (no.tipo === "DeclaracaoIf") return this.verificarIf(no);
    if (no.tipo === "ExpressaoStatement") return this.verificarExpressaoStatement(no);
    
    const noDesconhecido = no as any;
    throw new Error(`Erro Semântico [Linha ${noDesconhecido.linha || '?'}]: statement '${noDesconhecido.tipo}' não suportado.`);
  }

  /**
   * Verifica a declaração de uma variável.
   * O método infere o tipo da expressão atribuída e registra a variável no escopo atual.
   * 
   * @param no O nó de declaração de variável.
   * @returns O nó atualizado com o tipo inferido.
   */
  private verificarDeclaracao(no: NoDeclaracaoVariavel): NoDeclaracaoVariavel {
    const tipo = this.tipoDaExpressao(no.valorInicial);
    this.declarar(no.nome, no.modificador, tipo, no.linha);
    no.tipoInferido = tipo;
    return no;
  }

  /**
   * Verifica a estrutura de um bloco `if`.
   * A condição do `if` deve ser obrigatoriamente do tipo booleano.
   * 
   * @param no O nó da declaração `if`.
   * @returns O nó validado.
   * @throws Lança um erro se a condição não for do tipo booleano.
   */
  private verificarIf(no: NoDeclaracaoIf): NoDeclaracaoIf {
    const tipoCondicao = this.tipoDaExpressao(no.condicao);
    if (tipoCondicao !== "boolean") {
      throw new Error(`Erro Semântico [Linha ${no.linha}]: A condição do 'if' deve ser boolean, encontrado '${tipoCondicao}'.`);
    }
    this.verificarBloco(no.consequencia);
    if (no.alternativa) this.verificarBloco(no.alternativa);
    return no;
  }

  /**
   * Verifica um bloco de código delimitado por chaves.
   * O método cria um novo escopo antes de verificar os comandos internos e o remove ao terminar.
   * 
   * @param bloco O nó do bloco de código.
   */
  private verificarBloco(bloco: NoBloco): void {
    this.contadorEscopo++;
    this.escopos.push(new Map());
    for (const statement of bloco.corpo) {
      this.verificarStatement(statement);
    }
    this.escopos.pop();
  }

  /**
   * Verifica um comando composto apenas por uma expressão.
   * 
   * @param no O nó do comando de expressão.
   * @returns O nó validado.
   */
  private verificarExpressaoStatement(no: NoExpressaoStatement): NoExpressaoStatement {
    this.tipoDaExpressao(no.expressao);
    return no;
  }

  /**
   * Registra uma nova variável na tabela de símbolos do escopo atual.
   * 
   * @param nome O nome do identificador da variável.
   * @param modificador O tipo de declaração (let, const, var).
   * @param tipo O tipo de dado da variável.
   * @param linha A linha onde a variável é declarada.
   * @throws Lança um erro se a variável já existir no mesmo escopo.
   */
  private declarar(nome: string, modificador: Simbolo["modificador"], tipo: TipoSemantico, linha: number): void {
    const escopoAtual = this.escopos[this.escopos.length - 1];
    if (escopoAtual.has(nome)) {
      throw new Error(`Erro Semântico [Linha ${linha}]: A variável '${nome}' já foi declarada neste escopo.`);
    }
    const nivelEscopo = this.escopos.length === 1 ? "Global" : `Bloco-${this.contadorEscopo}`;
    const novoSimbolo: Simbolo = { nome, modificador, tipo, linhaDeclaracao: linha, escopo: nivelEscopo };
    
    escopoAtual.set(nome, novoSimbolo);
    this.registroSimbolos.push(novoSimbolo); // Guarda no histórico permanente
  }

  /**
   * Busca uma variável na pilha de escopos.
   * A busca começa no escopo mais interno e prossegue até o escopo global.
   * 
   * @param nome O nome da variável procurada.
   * @param linhaAtual A linha onde a busca está acontecendo (usada para mensagens de erro).
   * @returns Os dados do símbolo encontrado.
   * @throws Lança um erro se a variável não existir em nenhum escopo ativo.
   */
  private buscar(nome: string, linhaAtual: number): Simbolo {
    for (let i = this.escopos.length - 1; i >= 0; i--) {
      const simbolo = this.escopos[i].get(nome);
      if (simbolo) return simbolo;
    }
    throw new Error(`Erro Semântico [Linha ${linhaAtual}]: A variável '${nome}' não foi declarada.`);
  }

  /**
   * Infere e valida o tipo de dado de uma expressão.
   * 
   * @param no O nó da expressão.
   * @returns O tipo de dado inferido para a expressão.
   */
  private tipoDaExpressao(no: NoExpressao): TipoSemantico {
    if (no.tipo === "Literal") {
      if (no.tipoDado === "NUMERO") no.tipoInferido = "number";
      else if (no.tipoDado === "STRING") no.tipoInferido = "string";
      else no.tipoInferido = "boolean";
      return no.tipoInferido;
    }

    if (no.tipo === "Identificador") {
      no.tipoInferido = this.buscar(no.nome, no.linha).tipo;
      return no.tipoInferido;
    }

    return this.tipoBinario(no);
  }

  /**
   * Infere o tipo de dado de uma operação binária.
   * 
   * @param no O nó da expressão binária.
   * @returns O tipo de dado inferido para a operação.
   */
  private tipoBinario(no: NoExpressaoBinaria): TipoSemantico {
    if (OPERADORES_ATRIBUICAO.has(no.operador)) {
      no.tipoInferido = this.tipoAtribuicao(no);
      return no.tipoInferido;
    }
    const esquerda = this.tipoDaExpressao(no.esquerda);
    const direita = this.tipoDaExpressao(no.direita);
    no.tipoInferido = this.tipoOperacao(no.operador, esquerda, direita, no.linha);
    return no.tipoInferido;
  }

  /**
   * Verifica a validade e infere o tipo de uma operação de atribuição.
   * O método impede a reatribuição de constantes e assegura a compatibilidade de tipos.
   * 
   * @param no O nó de expressão de atribuição.
   * @returns O tipo de dado resultante da atribuição.
   * @throws Lança um erro se o alvo não for um identificador, se tentar reatribuir uma constante ou se os tipos forem incompatíveis.
   */
  private tipoAtribuicao(no: NoExpressaoBinaria): TipoSemantico {
    if (no.esquerda.tipo !== "Identificador") {
      throw new Error(`Erro Semântico [Linha ${no.linha}]: O lado esquerdo da atribuição deve ser um identificador.`);
    }

    const simbolo = this.buscar(no.esquerda.nome, no.linha);
    if (simbolo.modificador === "const") {
      throw new Error(`Erro Semântico [Linha ${no.linha}]: Não é possível reatribuir valor à constante '${simbolo.nome}' definida na linha ${simbolo.linhaDeclaracao}.`);
    }

    no.esquerda.tipoInferido = simbolo.tipo;
    const direita = this.tipoDaExpressao(no.direita);

    if (no.operador === "=") {
      if (direita !== simbolo.tipo) {
        throw new Error(`Erro Semântico [Linha ${no.linha}]: Atribuição incompatível para '${simbolo.nome}'. Esperado '${simbolo.tipo}', encontrado '${direita}'.`);
      }
      return simbolo.tipo;
    }

    if (simbolo.tipo !== "number" || direita !== "number") {
      throw new Error(`Erro Semântico [Linha ${no.linha}]: O operador '${no.operador}' não suporta os tipos '${simbolo.tipo}' e '${direita}'.`);
    }
    return "number";
  }

  /**
   * Valida uma operação binária matemática, relacional ou lógica com base nos operandos.
   * 
   * @param operador O símbolo da operação (ex: +, -, ==, &&).
   * @param esquerda O tipo de dado do lado esquerdo.
   * @param direita O tipo de dado do lado direito.
   * @param linha A linha onde a operação ocorre.
   * @returns O tipo de dado resultante da operação.
   * @throws Lança um erro se a operação for inválida para os tipos de dados fornecidos.
   */
  private tipoOperacao(operador: string, esquerda: TipoSemantico, direita: TipoSemantico, linha: number): TipoSemantico {
    if (operador === "+" && esquerda === "number" && direita === "number") return "number";
    if (operador === "+" && esquerda === "string" && direita === "string") return "string";
    if (OPERADORES_ARITMETICOS.has(operador) && esquerda === "number" && direita === "number") return "number";
    if (OPERADORES_RELACIONAIS.has(operador) && esquerda === "number" && direita === "number") return "boolean";
    if (OPERADORES_IGUALDADE.has(operador) && esquerda === direita) return "boolean";
    if (OPERADORES_LOGICOS.has(operador) && esquerda === "boolean" && direita === "boolean") return "boolean";

    throw new Error(`Erro Semântico [Linha ${linha}]: O operador '${operador}' não aceita os operandos de tipos '${esquerda}' e '${direita}'.`);
  }
}