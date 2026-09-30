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
} from "../utils/types";

interface Simbolo {
  nome: string;
  modificador: "let" | "const" | "var";
  tipo: TipoSemantico;
}

const OPERADORES_ATRIBUICAO = new Set(["=", "+=", "-="]);
const OPERADORES_ARITMETICOS = new Set(["-", "*", "/", "%"]);
const OPERADORES_RELACIONAIS = new Set([">", "<", ">=", "<="]);
const OPERADORES_IGUALDADE = new Set(["==", "!="]);
const OPERADORES_LOGICOS = new Set(["&&", "||"]);

export default class SemanticalAnalyzer extends AnalyzerModel {
  private escopos: Map<string, Simbolo>[] = [];

  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Semantico",
      description: "Analise semantica do compilador"
    })
  }

  /**
   * Analise Semantica do compilador
   *
   * @method run
   * @public
   * @description verifica escopos, declarações e tipos da AST produzida pelo sintático
   * @returns {boolean}
   */
  public run(): boolean {
    if (!this.client.ast) {
      throw new Error("Erro Semântico: AST ausente. Execute o analisador sintático antes.");
    }

    this.client.ast = this.analisar(this.client.ast);
    return true;
  }

  /**
   * Percorre o programa já reconhecido pelo sintático (declarações, if/else,
   * blocos e expressões) e anota o tipo inferido de cada nó.
   */
  public analisar(corpo: NoStatement[]): NoStatement[] {
    this.escopos = [new Map()];
    return corpo.map((statement) => this.verificarStatement(statement));
  }

  private verificarStatement(no: NoStatement): NoStatement {
    if (no.tipo === "DeclaracaoVariavel") return this.verificarDeclaracao(no);
    if (no.tipo === "DeclaracaoIf") return this.verificarIf(no);
    if (no.tipo === "ExpressaoStatement") return this.verificarExpressaoStatement(no);
    throw new Error(`Erro Semântico: statement '${(no as { tipo?: string }).tipo}' não suportado`);
  }

  private verificarDeclaracao(no: NoDeclaracaoVariavel): NoDeclaracaoVariavel {
    const tipo = this.tipoDaExpressao(no.valorInicial);
    this.declarar(no.nome, no.modificador, tipo);
    no.tipoInferido = tipo;
    return no;
  }

  private verificarIf(no: NoDeclaracaoIf): NoDeclaracaoIf {
    const tipoCondicao = this.tipoDaExpressao(no.condicao);
    if (tipoCondicao !== "boolean") {
      throw new Error(
        `Erro Semântico: condição do if deve ser boolean, encontrado '${tipoCondicao}'`
      );
    }

    this.verificarBloco(no.consequencia);
    if (no.alternativa) this.verificarBloco(no.alternativa);
    return no;
  }

  private verificarBloco(bloco: NoBloco): void {
    this.escopos.push(new Map());
    for (const statement of bloco.corpo) {
      this.verificarStatement(statement);
    }
    this.escopos.pop();
  }

  private verificarExpressaoStatement(no: NoExpressaoStatement): NoExpressaoStatement {
    this.tipoDaExpressao(no.expressao);
    return no;
  }

  private declarar(nome: string, modificador: Simbolo["modificador"], tipo: TipoSemantico): void {
    const escopoAtual = this.escopos[this.escopos.length - 1];
    if (escopoAtual.has(nome)) {
      throw new Error(`Erro Semântico: '${nome}' já foi declarado neste escopo`);
    }
    escopoAtual.set(nome, { nome, modificador, tipo });
  }

  private buscar(nome: string): Simbolo {
    for (let i = this.escopos.length - 1; i >= 0; i--) {
      const simbolo = this.escopos[i].get(nome);
      if (simbolo) return simbolo;
    }
    throw new Error(`Erro Semântico: variável '${nome}' não declarada`);
  }

  private tipoDaExpressao(no: NoExpressao): TipoSemantico {
    if (no.tipo === "Literal") {
      if (no.tipoDado === "NUMERO") no.tipoInferido = "number";
      else if (no.tipoDado === "STRING") no.tipoInferido = "string";
      else no.tipoInferido = "boolean";
      return no.tipoInferido;
    }

    if (no.tipo === "Identificador") {
      no.tipoInferido = this.buscar(no.nome).tipo;
      return no.tipoInferido;
    }

    return this.tipoBinario(no);
  }

  private tipoBinario(no: NoExpressaoBinaria): TipoSemantico {
    if (OPERADORES_ATRIBUICAO.has(no.operador)) {
      no.tipoInferido = this.tipoAtribuicao(no);
      return no.tipoInferido;
    }

    const esquerda = this.tipoDaExpressao(no.esquerda);
    const direita = this.tipoDaExpressao(no.direita);
    no.tipoInferido = this.tipoOperacao(no.operador, esquerda, direita);
    return no.tipoInferido;
  }

  private tipoAtribuicao(no: NoExpressaoBinaria): TipoSemantico {
    if (no.esquerda.tipo !== "Identificador") {
      throw new Error("Erro Semântico: lado esquerdo da atribuição deve ser um identificador");
    }

    const simbolo = this.buscar(no.esquerda.nome);
    if (simbolo.modificador === "const") {
      throw new Error(`Erro Semântico: não é possível reatribuir a constante '${simbolo.nome}'`);
    }

    no.esquerda.tipoInferido = simbolo.tipo;
    const direita = this.tipoDaExpressao(no.direita);

    if (no.operador === "=") {
      if (direita !== simbolo.tipo) {
        throw new Error(
          `Erro Semântico: atribuição incompatível para '${simbolo.nome}': esperado '${simbolo.tipo}', encontrado '${direita}'`
        );
      }
      return simbolo.tipo;
    }

    if (simbolo.tipo !== "number" || direita !== "number") {
      throw new Error(
        `Erro Semântico: operador '${no.operador}' não aceita operandos '${simbolo.tipo}' e '${direita}'`
      );
    }
    return "number";
  }

  private tipoOperacao(operador: string, esquerda: TipoSemantico, direita: TipoSemantico): TipoSemantico {
    if (operador === "+" && esquerda === "number" && direita === "number") return "number";
    if (operador === "+" && esquerda === "string" && direita === "string") return "string";
    if (OPERADORES_ARITMETICOS.has(operador) && esquerda === "number" && direita === "number") return "number";
    if (OPERADORES_RELACIONAIS.has(operador) && esquerda === "number" && direita === "number") return "boolean";
    if (OPERADORES_IGUALDADE.has(operador) && esquerda === direita) return "boolean";
    if (OPERADORES_LOGICOS.has(operador) && esquerda === "boolean" && direita === "boolean") return "boolean";

    throw new Error(
      `Erro Semântico: operador '${operador}' não aceita operandos '${esquerda}' e '${direita}'`
    );
  }
}
