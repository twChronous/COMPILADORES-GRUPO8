import { MAPA_TIPOS_GO, MAPA_TIPO_LITERAL } from "../utils/go.constants";

import type {
  NoDeclaracaoVariavel,
  NoExpressao,
  NoExpressaoBinaria,
  NoReturnStatement,
  NoStatement,
  TipoSemantico,
} from "../utils/types";

// Tipo conhecido de uma expressão durante a inferência. `undefined` significa "ainda desconhecido". 
type TipoInferido = TipoSemantico | undefined;

// Escopo de inferência: nome do identificador -> tipo conhecido. 
type Escopo = Map<string, TipoInferido>;

// Assinatura deduzida de uma função JavaScript do nível global. 
interface AssinaturaFuncao {
  // Tipo de cada parâmetro, na ordem de declaração. 
  parametros: TipoInferido[];
  // Tipo devolvido pelos `return` com valor. Vira `any` se os `return` discordarem entre si. 
  retorno: TipoInferido;
}

// Operadores de atribuição: o tipo do resultado é o tipo do lado esquerdo. 
const OPERADORES_ATRIBUICAO: ReadonlySet<string> = new Set(["=", "+=", "-="]);

// Operadores cujo resultado é sempre booleano. 
const OPERADORES_BOOLEANOS: ReadonlySet<string> = new Set(["==", "!=", ">", "<", ">=", "<=", "&&", "||"]);

// Limite de passadas da inferência (protege contra laço infinito em casos patológicos). 
const MAX_PASSADAS = 10;

// Deduz os tipos Go de parâmetros, retornos e variáveis de um programa JavaScript.
export default class InferenciaTiposGo {
  // Assinaturas das funções declaradas no nível global, indexadas pelo nome em JS. 
  private assinaturas: Map<string, AssinaturaFuncao> = new Map();

  // Tipo da expressão de cada declaração de variável e de cada `return` com valor. 
  private tiposNos: WeakMap<object, TipoInferido> = new WeakMap();

  
  // Analisa o programa inteiro e guarda os tipos descobertos para consulta posterior.

  public analisar(corpo: NoStatement[]): void {
    this.assinaturas = new Map();
    this.tiposNos = new WeakMap();

    for (const no of corpo) {
      if (no.tipo === "DeclaracaoFuncao") {
        this.assinaturas.set(no.nome, {
          parametros: no.parametros.map(() => undefined),
          retorno: undefined,
        });
      }
    }

    for (let passada = 0; passada < MAX_PASSADAS; passada++) {
      const antes = this.serializar();
      this.percorrerStatements(corpo, [new Map()], undefined);
      if (this.serializar() === antes) break;
    }
  }


   //Tipo deduzido de um parâmetro de função.
   
  public tipoParametro(funcao: string, indice: number): TipoSemantico | undefined {
    return this.assinaturas.get(funcao)?.parametros[indice];
  }
  

   // Tipo deduzido da expressão de uma declaração de variável ou de um `return` com valor.
  public tipoDoNo(no: NoDeclaracaoVariavel | NoReturnStatement): TipoSemantico | undefined {
    return this.tiposNos.get(no);
  }

  private serializar(): string {
    return JSON.stringify([...this.assinaturas.entries()]);
  }

  private percorrerStatements(lista: NoStatement[], escopos: Escopo[], funcao?: AssinaturaFuncao): void {
    for (const no of lista) this.percorrerStatement(no, escopos, funcao);
  }

// Visita um comando atualizando assinaturas, escopos e os tipos guardados por nó.
  private percorrerStatement(no: NoStatement, escopos: Escopo[], funcao?: AssinaturaFuncao): void {
    switch (no.tipo) {
      case "DeclaracaoVariavel": {
        this.percorrerExpressao(no.valorInicial, escopos);
        const tipo = this.tipoDe(no.valorInicial, escopos);
        this.tiposNos.set(no, tipo);
        escopos[escopos.length - 1].set(no.nome, tipo);
        break;
      }
      case "ExpressaoStatement":
        this.percorrerExpressao(no.expressao, escopos);
        break;
      case "ReturnStatement": {
        if (!no.argumento) break;
        this.percorrerExpressao(no.argumento, escopos);

        const tipo = this.tipoDe(no.argumento, escopos);
        this.tiposNos.set(no, tipo);

        if (funcao && this.ehTipoGo(tipo)) {
          if (funcao.retorno === undefined) funcao.retorno = tipo;
          else if (funcao.retorno !== tipo) funcao.retorno = "any";
        }
        break;
      }
      case "Bloco":
        this.percorrerBloco(no.corpo, escopos, funcao);
        break;
      case "DeclaracaoIf":
        this.percorrerExpressao(no.condicao, escopos);
        this.percorrerBloco(no.consequencia.corpo, escopos, funcao);
        if (no.alternativa) this.percorrerBloco(no.alternativa.corpo, escopos, funcao);
        break;
      case "DeclaracaoWhile":
        this.percorrerExpressao(no.condicao, escopos);
        this.percorrerBloco(no.corpo.corpo, escopos, funcao);
        break;
      case "DeclaracaoFor":
        escopos.push(new Map());
        if (no.inicializacao) this.percorrerStatement(no.inicializacao, escopos, funcao);
        if (no.condicao) this.percorrerExpressao(no.condicao, escopos);
        if (no.atualizacao) this.percorrerExpressao(no.atualizacao, escopos);
        this.percorrerBloco(no.corpo.corpo, escopos, funcao);
        escopos.pop();
        break;
      case "DeclaracaoFuncao": {
        const assinatura = this.assinaturas.get(no.nome);
        const escopoFuncao: Escopo = new Map();
        no.parametros.forEach((param, i) => escopoFuncao.set(param.nome, assinatura?.parametros[i]));

        escopos.push(escopoFuncao);
        this.percorrerStatements(no.corpo.corpo, escopos, assinatura);
        escopos.pop();
        break;
      }
      case "BreakStatement":
      case "ContinueStatement":
        break;
    }
  }

  private percorrerBloco(lista: NoStatement[], escopos: Escopo[], funcao?: AssinaturaFuncao): void {
    escopos.push(new Map());
    this.percorrerStatements(lista, escopos, funcao);
    escopos.pop();
  }

  
//Visita uma expressão; em cada chamada de função do usuário, registra o tipo dos argumentos
  private percorrerExpressao(no: NoExpressao, escopos: Escopo[]): void {
    switch (no.tipo) {
      case "ExpressaoBinaria":
        this.percorrerExpressao(no.esquerda, escopos);
        this.percorrerExpressao(no.direita, escopos);
        break;
      case "AcessoMembro":
        this.percorrerExpressao(no.objeto, escopos);
        break;
      case "ChamadaFuncao": {
        this.percorrerExpressao(no.callee, escopos);
        no.argumentos.forEach((arg) => this.percorrerExpressao(arg, escopos));

        if (no.callee.tipo !== "Identificador") break;
        const assinatura = this.assinaturas.get(no.callee.nome);
        if (!assinatura) break;

        no.argumentos.forEach((arg, i) => {
          if (i >= assinatura.parametros.length || assinatura.parametros[i] !== undefined) return;
          const tipo = this.tipoDe(arg, escopos);
          if (this.ehTipoGo(tipo)) assinatura.parametros[i] = tipo;
        });
        break;
      }
      case "Literal":
      case "Identificador":
        break;
    }
  }


// Deduz o tipo de uma expressão com base nos literais, no escopo e nas assinaturas conhecidas.
  private tipoDe(no: NoExpressao, escopos: Escopo[]): TipoInferido {
    switch (no.tipo) {
      case "Literal":
        return MAPA_TIPO_LITERAL[no.tipoDado];
      case "Identificador": {
        for (let i = escopos.length - 1; i >= 0; i--) {
          if (escopos[i].has(no.nome)) return escopos[i].get(no.nome);
        }
        return this.tipoDoSemantico(no);
      }
      case "ExpressaoBinaria":
        return this.tipoBinario(no, escopos);
      case "ChamadaFuncao":
        return no.callee.tipo === "Identificador"
          ? this.assinaturas.get(no.callee.nome)?.retorno
          : this.tipoDoSemantico(no);
      default:
        return this.tipoDoSemantico(no);
    }
  }

  private tipoBinario(no: NoExpressaoBinaria, escopos: Escopo[]): TipoInferido {
    if (OPERADORES_BOOLEANOS.has(no.operador)) return "boolean";
    if (OPERADORES_ATRIBUICAO.has(no.operador)) return this.tipoDe(no.esquerda, escopos);

    if (no.operador === "+") {
      const esquerda = this.tipoDe(no.esquerda, escopos);
      const direita = this.tipoDe(no.direita, escopos);
      if (esquerda === "string" || direita === "string") return "string";
      // Só é número se os dois lados forem: `x + 1` com `x` desconhecido pode ser concatenação.
      if (esquerda === "number" && direita === "number") return "number";
      return undefined;
    }

    // `-`, `*`, `/` e `%` sempre produzem número.
    return "number";
  }

  // Aproveita o tipo que o semântico anotou, mas só quando ele é concreto (não `any`). 
  private tipoDoSemantico(no: NoExpressao): TipoInferido {
    return this.ehTipoGo(no.tipoInferido) ? no.tipoInferido : undefined;
  }

  // Indica se o tipo tem equivalente direto em Go (`float64`, `string` ou `bool`). 
  private ehTipoGo(tipo: TipoInferido): tipo is TipoSemantico {
    return tipo !== undefined && tipo in MAPA_TIPOS_GO;
  }
}