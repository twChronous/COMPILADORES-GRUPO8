import AnalyzerModel from "../models/Analyzer.model";
import {
  ClientInterface,
  NoDeclaracaoVariavel,
  NoExpressao,
  NoExpressaoBinaria,
  NoExpressaoStatement,
  NoLiteral,
  NoStatement,
  TipoSemantico,
} from "../utils/types";

const OPERADORES_ATRIBUICAO = new Set(["=", "+=", "-="]);

/** Precedência dos operadores (menor número = menor precedência). */
const PRECEDENCIA: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  ">": 4,
  "<": 4,
  ">=": 4,
  "<=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

const ASSOCIATIVIDADE_DIREITA = new Set(["||", "&&"]);

/**
 * Gera código Go a partir da AST validada pelo analisador semântico.
 * Escopo desta etapa: literais, identificadores, expressões binárias,
 * declarações `let`/`const`/`var` e atribuições (`=`, `+=`, `-=`).
 */
export default class GoCodegenAnalyzer extends AnalyzerModel {

  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "GoCodegen",
      description:
        "Traduz expressões, literais e declarações de variáveis da AST para Go.",
    });
  }

  /**
   * Gera o código Go do programa presente em `client.ast`.
   *
   * @returns `true` se a geração concluir; `false` se a AST estiver ausente.
   */
  public run(): boolean {
    if (!this.client.ast) {
      this.client.LOG_ERR(
        "Erro de Codegen: AST ausente. Execute o analisador semântico antes.",
      );
      return false;
    }

    this.client.codigoGo = this.gerarStatements(this.client.ast);
    return true;
  }

  /**
   * Converte uma lista de comandos suportados em texto Go (corpo de função).
   */
  public gerarStatements(statements: NoStatement[]): string {
    return statements.map((s) => this.gerarStatement(s)).join("\n");
  }

  /**
   * Emite um único comando suportado nesta issue.
   */
  public gerarStatement(statement: NoStatement): string {
    if (statement.tipo === "DeclaracaoVariavel") {
      return this.gerarDeclaracao(statement);
    }
    if (statement.tipo === "ExpressaoStatement") {
      return this.gerarExpressaoStatement(statement);
    }
    throw new Error(
      `Codegen Go [Linha ${statement.linha}]: comando '${statement.tipo}' não implementado nesta etapa (ver issues #68/#69).`,
    );
  }

  /**
   * Emite uma expressão Go com parênteses quando a precedência exigir.
   */
  public gerarExpressao(expressao: NoExpressao, contexto?: TipoSemantico): string {
    return this.emitirExpressao(expressao, null, null, contexto);
  }

  private gerarDeclaracao(no: NoDeclaracaoVariavel): string {
    const tipo = this.tipoGo(no.tipoInferido ?? no.valorInicial.tipoInferido);
    const valor = this.gerarExpressao(no.valorInicial, no.tipoInferido);
    const palavraChave = no.modificador === "const" ? "const" : "var";
    return `${palavraChave} ${no.nome} ${tipo} = ${valor}`;
  }

  private gerarExpressaoStatement(no: NoExpressaoStatement): string {
    const expressao = no.expressao;
    if (expressao.tipo === "ExpressaoBinaria" && OPERADORES_ATRIBUICAO.has(expressao.operador)) {
      return this.gerarExpressao(expressao);
    }
    throw new Error(
      `Codegen Go [Linha ${no.linha}]: comando de expressão sem atribuição não é fragmento Go válido nesta etapa.`,
    );
  }

  private emitirExpressao(
    no: NoExpressao,
    operadorPai: string | null,
    lado: "esquerda" | "direita" | null,
    tipoContexto?: TipoSemantico,
  ): string {
    let texto: string;

    switch (no.tipo) {
      case "Literal":
        texto = this.gerarLiteral(no, tipoContexto ?? no.tipoInferido);
        break;
      case "Identificador":
        texto = no.nome;
        break;
      case "ExpressaoBinaria":
        texto = this.gerarExpressaoBinaria(no);
        break;
      default:
        throw new Error(
          `Codegen Go [Linha ${no.linha}]: expressão '${no.tipo}' não implementada nesta etapa.`,
        );
    }

    if (
      no.tipo === "ExpressaoBinaria" &&
      !OPERADORES_ATRIBUICAO.has(no.operador) &&
      operadorPai &&
      lado
    ) {
      const precFilho = PRECEDENCIA[no.operador] ?? 0;
      const precPai = PRECEDENCIA[operadorPai] ?? 0;
      const precisaParenteses =
        precFilho < precPai ||
        (precFilho === precPai &&
          lado === "direita" &&
          ASSOCIATIVIDADE_DIREITA.has(operadorPai));
      if (precisaParenteses) {
        return `(${texto})`;
      }
    }

    return texto;
  }

  private gerarExpressaoBinaria(no: NoExpressaoBinaria): string {
    if (OPERADORES_ATRIBUICAO.has(no.operador)) {
      const esquerda = this.emitirExpressao(no.esquerda, no.operador, "esquerda");
      const direita = this.emitirExpressao(no.direita, no.operador, "direita");
      return `${esquerda} ${no.operador} ${direita}`;
    }

    const operadorGo = this.mapOperador(no.operador);
    const esquerda = this.emitirExpressao(no.esquerda, no.operador, "esquerda");
    const direita = this.emitirExpressao(no.direita, no.operador, "direita");
    return `${esquerda} ${operadorGo} ${direita}`;
  }

  private gerarLiteral(no: NoLiteral, tipoContexto?: TipoSemantico): string {
    switch (no.tipoDado) {
      case "NUMERO":
        return no.valor;
      case "STRING":
        return this.escaparStringGo(no.valor);
      case "BOOLEAN":
        return no.valor.toLowerCase();
      case "NULL":
        return "nil";
      case "UNDEFINED":
        return this.valorZero(tipoContexto ?? no.tipoInferido);
      default:
        return no.valor;
    }
  }

  private mapOperador(operador: string): string {
    return operador;
  }

  private tipoGo(tipo?: TipoSemantico): string {
    switch (tipo) {
      case "number":
        return "float64";
      case "string":
        return "string";
      case "boolean":
        return "bool";
      case "null":
      case "undefined":
      case "any":
      case "object":
        return "interface{}";
      default:
        return "interface{}";
    }
  }

  private valorZero(tipo?: TipoSemantico): string {
    switch (tipo) {
      case "number":
        return "0";
      case "string":
        return '""';
      case "boolean":
        return "false";
      case "null":
      case "undefined":
      case "any":
      case "object":
        return "nil";
      default:
        return "nil";
    }
  }

  private escaparStringGo(conteudo: string): string {
    return `"${conteudo
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")}"`;
  }

}