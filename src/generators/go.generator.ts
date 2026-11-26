import GeneratorModel from "../models/Generator.model";

import {
  MAPA_TIPOS_GO,
  MAPA_NATIVOS_GO,
  MAPA_TIPO_LITERAL,
  PRECEDENCIA_OPERADORES,
  OPERADORES_NAO_ASSOCIATIVOS_DIREITA,
} from "../utils/go.constants";

import {
  NoBloco,
  NoLiteral,
  NoExpressao,
  NoStatement,
  TipoSemantico,
  NoAcessoMembro,
  NoChamadaFuncao,
  ClientInterface,
  NoReturnStatement,
  NoExpressaoBinaria,
  NoDeclaracaoFuncao,
  NoDeclaracaoVariavel,
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

  private readonly geradoresStatement: Partial<{
    [K in NoStatement["tipo"]]: (stmt: Extract<NoStatement, { tipo: K }>, nivel: number) => string;
  }> = {
    DeclaracaoVariavel: (stmt, nivel) => this.gerarDeclaracaoVariavel(stmt, nivel),
    ExpressaoStatement: (stmt, nivel) => `${this.indentar(nivel)}${this.gerarExpressao(stmt.expressao)}`,
    ReturnStatement: (stmt, nivel) => this.gerarReturn(stmt, nivel),
    DeclaracaoFuncao: (stmt) => {
      throw new Error(
        `Erro de Geração [Linha ${stmt.linha}]: Declaração de função aninhada '${stmt.nome}' não suportada em Go.`
      );
    },
  };

  private readonly geradoresExpressao: {
    [K in NoExpressao["tipo"]]: (expr: Extract<NoExpressao, { tipo: K }>) => string;
  } = {
    Literal: (expr) => this.formatadoresLiteral[expr.tipoDado](expr.valor),
    Identificador: (expr) => expr.nome,
    ExpressaoBinaria: (expr) => this.gerarExpressaoBinaria(expr),
    AcessoMembro: (expr) => this.gerarAcessoMembro(expr),
    ChamadaFuncao: (expr) => this.gerarChamadaFuncao(expr),
  };

  private readonly extratoresBloco: Partial<{
    [K in NoStatement["tipo"]]: (stmt: Extract<NoStatement, { tipo: K }>) => NoBloco[];
  }> = {
    Bloco: (stmt) => [stmt],
    DeclaracaoIf: (stmt) =>
      stmt.alternativa ? [stmt.consequencia, stmt.alternativa] : [stmt.consequencia],
    DeclaracaoWhile: (stmt) => [stmt.corpo],
    DeclaracaoFor: (stmt) => [stmt.corpo],
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

    const funcoesTopo: string[] = [];
    const comandosMain: string[] = [];

    for (const stmt of corpo) {
      if (stmt.tipo === "DeclaracaoFuncao") {
        funcoesTopo.push(this.gerarDeclaracaoFuncao(stmt));
      } else {
        comandosMain.push(this.gerarStatement(stmt, 1));
      }
    }

    const corpoMain = comandosMain.length > 0 ? `\n${comandosMain.join("\n")}\n` : "\n";

    return [
      "package main",
      this.formatarImports(),
      ...funcoesTopo,
      `func main() {${corpoMain}}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Formata o bloco `import` com os pacotes coletados durante a travessia da AST.
   *
   * @returns Declaração de importação ou string vazia se nenhum pacote for usado.
   */
  private formatarImports(): string {
    if (this.imports.size === 0) return "";

    const pacotes = Array.from(this.imports).sort();
    if (pacotes.length === 1) return `import "${pacotes[0]}"`;

    return `import (\n${pacotes.map((pkg) => `${this.indentar(1)}"${pkg}"`).join("\n")}\n)`;
  }

  /**
   * Retorna a indentação em tabulações conforme convenção `gofmt`.
   *
   * @param nivel Nível de aninhamento atual.
   * @returns String com tabulações correspondentes ao nível.
   */
  private indentar(nivel: number): string {
    return "\t".repeat(nivel);
  }

  /**
   * Mapeia um tipo semântico da AST para o tipo equivalente em Go.
   *
   * @param tipo Tipo inferido pelo analisador semântico.
   * @returns Nome do tipo em Go.
   */
  private mapearTipo(tipo?: TipoSemantico): string {
    return (tipo && MAPA_TIPOS_GO[tipo]) || "any";
  }

  /**
   * Obtém o tipo semântico efetivo de uma expressão, usando `tipoInferido`
   * ou fallback direto para literais quando a AST não passou pelo semântico.
   *
   * @param no Nó de expressão da AST.
   * @returns Tipo semântico correspondente.
   */
  private inferirTipoExpressao(no: NoExpressao): TipoSemantico {
    return no.tipoInferido ?? (no.tipo === "Literal" ? MAPA_TIPO_LITERAL[no.tipoDado] : "any");
  }

  /**
   * Escapa caracteres especiais para emissão segura de strings em Go.
   *
   * @param valor Conteúdo textual da string.
   * @returns String escapada sem aspas externas.
   */
  private escaparString(valor: string): string {
    return valor
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  /**
   * Despacha a geração de um comando (`NoStatement`) no nível de indentação informado.
   *
   * @param stmt Nó de comando da AST.
   * @param nivel Nível de indentação atual.
   * @returns Trecho de código Go correspondente ao comando.
   */
  private gerarStatement(stmt: NoStatement, nivel: number): string {
    const gerar = this.geradoresStatement[stmt.tipo] as
      | ((no: NoStatement, nivel: number) => string)
      | undefined;

    if (!gerar) {
      throw new Error(
        `Erro de Geração [Linha ${stmt.linha}]: Comando '${stmt.tipo}' ainda não implementado no gerador Go.`
      );
    }

    return gerar(stmt, nivel);
  }

  /**
   * Gera a declaração de variável ou constante em Go (`var` ou `const`).
   *
   * @param no Nó `DeclaracaoVariavel` da AST.
   * @param nivel Nível de indentação atual.
   * @returns Linha de declaração em Go.
   */
  private gerarDeclaracaoVariavel(no: NoDeclaracaoVariavel, nivel: number): string {
    const indent = this.indentar(nivel);
    const tipo = no.tipoInferido ?? this.inferirTipoExpressao(no.valorInicial);
    const tipoGo = this.mapearTipo(tipo);
    const valor = this.gerarExpressao(no.valorInicial);
    const podeSerConst = no.modificador === "const" && tipoGo !== "any";

    return podeSerConst
      ? `${indent}const ${no.nome} = ${valor}`
      : `${indent}var ${no.nome} ${tipoGo} = ${valor}`;
  }

  /**
   * Gera uma função de nível de pacote em Go a partir de `NoDeclaracaoFuncao`.
   *
   * @param no Nó de declaração de função da AST.
   * @returns Código completo da função em Go.
   */
  private gerarDeclaracaoFuncao(no: NoDeclaracaoFuncao): string {
    const parametros = no.parametros.map((p) => `${p.nome} any`).join(", ");
    const tipoRetorno = this.inferirRetornoFuncao(no.corpo);
    const assinaturaRetorno = tipoRetorno ? ` ${tipoRetorno}` : "";
    const linhasCorpo = no.corpo.corpo.map((stmt) => this.gerarStatement(stmt, 1));
    const corpoFormatado = linhasCorpo.length > 0 ? `\n${linhasCorpo.join("\n")}\n` : "\n";

    return `func ${no.nome}(${parametros})${assinaturaRetorno} {${corpoFormatado}}`;
  }

  /**
   * Coleta recursivamente todos os `ReturnStatement` dentro do corpo de uma função,
   * sem invadir declarações de funções internas.
   *
   * @param bloco Bloco a ser percorrido.
   * @returns Lista de nós `ReturnStatement` encontrados.
   */
  private coletarRetornos(bloco: NoBloco): NoReturnStatement[] {
    return bloco.corpo.flatMap((stmt) => {
      if (stmt.tipo === "ReturnStatement") return [stmt];
      const extrair = this.extratoresBloco[stmt.tipo] as ((no: NoStatement) => NoBloco[]) | undefined;
      return extrair ? extrair(stmt).flatMap((sub) => this.coletarRetornos(sub)) : [];
    });
  }

  /**
   * Infere o tipo de retorno Go de uma função a partir dos nós `ReturnStatement` do corpo.
   *
   * @param corpo Bloco da função.
   * @returns Tipo Go de retorno ou string vazia caso seja `void`.
   */
  private inferirRetornoFuncao(corpo: NoBloco): string {
    const retornos = this.coletarRetornos(corpo).filter((ret) => ret.argumento !== null);
    if (retornos.length === 0) return "";

    const tiposGo = new Set(
      retornos.map((ret) =>
        this.mapearTipo(ret.tipoInferido ?? this.inferirTipoExpressao(ret.argumento!))
      )
    );

    return tiposGo.size === 1 ? Array.from(tiposGo)[0] : "any";
  }

  /**
   * Gera a instrução `return` em Go.
   *
   * @param no Nó `ReturnStatement` da AST.
   * @param nivel Nível de indentação atual.
   * @returns Linha `return` em Go.
   */
  private gerarReturn(no: NoReturnStatement, nivel: number): string {
    const retorno = no.argumento ? ` ${this.gerarExpressao(no.argumento)}` : "";
    return `${this.indentar(nivel)}return${retorno}`;
  }

  /**
   * Despacha a geração de uma expressão (`NoExpressao`) para código Go.
   *
   * @param no Nó de expressão da AST.
   * @returns Representação da expressão em Go.
   */
  private gerarExpressao(no: NoExpressao): string {
    const gerar = this.geradoresExpressao[no.tipo] as (expr: NoExpressao) => string;
    return gerar(no);
  }

  /**
   * Traduz um acesso a membro, mapeando chamadas nativas suportadas para seus pacotes Go.
   *
   * @param no Nó `AcessoMembro` da AST.
   * @returns Expressão de acesso ou equivalente nativo em Go.
   */
  private gerarAcessoMembro(no: NoAcessoMembro): string {
    const chave = `${this.gerarExpressao(no.objeto)}.${no.propriedade}`;
    const nativo = MAPA_NATIVOS_GO[chave];

    if (nativo) {
      this.imports.add(nativo.pacote);
      return nativo.chamada;
    }

    return chave;
  }

  /**
   * Traduz uma chamada de função e seus argumentos para Go.
   *
   * @param no Nó `ChamadaFuncao` da AST.
   * @returns Expressão de chamada em Go.
   */
  private gerarChamadaFuncao(no: NoChamadaFuncao): string {
    const callee = this.gerarExpressao(no.callee);
    const args = no.argumentos.map((arg) => this.gerarExpressao(arg)).join(", ");
    return `${callee}(${args})`;
  }

  /**
   * Envolve uma subexpressão binária em parênteses quando sua precedência exige agrupamento explícito.
   *
   * @param expr Subexpressão da AST.
   * @param precPai Precedência do operador pai.
   * @param incluirIgual Se `true`, envolve também quando as precedências forem iguais.
   * @returns Expressão formatada com ou sem parênteses.
   */
  private envolverSeNecessario(expr: NoExpressao, precPai: number, incluirIgual: boolean): string {
    const codigo = this.gerarExpressao(expr);
    if (expr.tipo !== "ExpressaoBinaria") return codigo;

    const precFilho = PRECEDENCIA_OPERADORES[expr.operador] ?? 0;
    const precisaParenteses = precFilho < precPai || (incluirIgual && precFilho === precPai);
    return precisaParenteses ? `(${codigo})` : codigo;
  }

  /**
   * Traduz uma expressão binária preservando parênteses conforme a precedência dos operadores.
   *
   * @param no Nó `ExpressaoBinaria` da AST.
   * @returns Expressão binária em Go.
   */
  private gerarExpressaoBinaria(no: NoExpressaoBinaria): string {
    const precPai = PRECEDENCIA_OPERADORES[no.operador] ?? 0;
    const esquerda = this.envolverSeNecessario(no.esquerda, precPai, false);
    const direita = this.envolverSeNecessario(
      no.direita,
      precPai,
      OPERADORES_NAO_ASSOCIATIVOS_DIREITA.has(no.operador)
    );

    return `${esquerda} ${no.operador} ${direita}`;
  }
}
