import GeneratorModel from "../models/Generator.model";

import {
  MAPA_NATIVOS_GO,
  MAPA_TIPOS_GO,
  MAPA_TIPO_LITERAL,
  OPERADORES_NAO_ASSOCIATIVOS_DIREITA,
  PRECEDENCIA_OPERADORES,
} from "../utils/go.constants";

import {
  ClientInterface,
  NoAcessoMembro,
  NoBloco,
  NoChamadaFuncao,
  NoDeclaracaoFuncao,
  NoDeclaracaoVariavel,
  NoExpressao,
  NoExpressaoBinaria,
  NoLiteral,
  NoReturnStatement,
  NoStatement,
  TipoSemantico,
} from "../utils/types";

/**
 * Gera o código final em Go diretamente a partir da Árvore Sintática Abstrata (AST).
 */
export default class GoGenerator extends GeneratorModel {
  private imports: Set<string> = new Set();

  private readonly formatadoresLiteral: Record<NoLiteral["tipoDado"], (valor: string) => string> = {
    NUMERO: (valor) => valor,
    BOOLEAN: (valor) => valor,
    STRING: (valor) => `"${this.escaparString(valor)}"`,
    NULL: () => "nil",
    UNDEFINED: () => "nil",
  };

  /**
   * Inicializa o gerador de código final em Go.
   *
   * @param compiler O cliente do compilador que gerencia a aplicação.
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
      name: "Generator",
      output: "go",
      description: "Gera o codigo final em Go a partir da AST",
    });
  }

  /**
   * Inicia o processo de geração de código Go consumindo `this.client.ast`.
   * Armazena o código resultante em `this.client.codigoGerado`.
   *
   * @returns Retorna `true` quando a geração termina com sucesso, ou `false` em caso de falha.
   */
  public run(): boolean {
    if (!this.client.ast) {
      this.client.LOG_ERR("Erro de Geração: AST ausente. Execute os analisadores antes.");
      return false;
    }

    try {
      this.client.codigoGerado = this.gerar(this.client.ast);
      return true;
    } catch (error: unknown) {
      this.client.LOG_ERR(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Converte uma lista de comandos da AST em um arquivo fonte Go completo (`package main`).
   *
   * @param corpo Lista de statements no escopo global da AST.
   * @returns Código-fonte Go formatado.
   */
  public gerar(corpo: NoStatement[]): string {
    this.imports = new Set();
    let corpoMain
    return [
      "package main",
      this.formatarImports(),
      `func main() {${corpoMain}}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
 public formatarImports() {

 }
}
