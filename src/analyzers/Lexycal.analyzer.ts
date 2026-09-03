import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, argsProps } from "../utils/types";

//apenas teste basico sem ser o final em GO
const Palavras_Reservadas = {
  NUMERO: 'NUMERO',
  IDENTIFICADOR: 'IDENTIFICADOR',
  ATRIBUICAO: 'ATRIBUICAO', // =
  SOMA: 'SOMA',           // +
  EOF: 'EOF'              // Fim do arquivo (End of File)
};

export default class LexAnalyzer extends AnalyzerModel {
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Lexico",
        description: "Analise Léxica do compilador"
    })
  }

  /**
   * Analise Léxica do compilador
   * 
   * @method run
   * @public
   * @description Faz a analise lexica
   * @returns {void}
   */
  public run(args:argsProps): boolean {
    this.analisarLexico(args.input)
    return true;
  }

  private analisarLexico(entrada:String) {
    let atual = 0;
    const tokens = [];

    while (atual < entrada.length) {
      let caractere = entrada[atual];

      // 1. Ignorar espaços em branco
      if (/\s/.test(caractere)) {
        atual++;
        continue;
      }

      // 2. Reconhecer Números
      if (/[0-9]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[0-9]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }
        tokens.push({ tipo: Palavras_Reservadas.NUMERO, valor });
        continue;
      }

      // 3. Reconhecer Identificadores (variáveis, palavras-chave)
      if (/[a-zA-Z_]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[a-zA-Z0-9_]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }
        tokens.push({ tipo: Palavras_Reservadas.IDENTIFICADOR, valor });
        continue;
      }

      // 4. Reconhecer Operadores
      if (caractere === '=') {
        tokens.push({ tipo: Palavras_Reservadas.ATRIBUICAO, valor: '=' });
        atual++;
        continue;
      }

      if (caractere === '+') {
        tokens.push({ tipo: Palavras_Reservadas.SOMA, valor: '+' });
        atual++;
        continue;
      }

      // Se chegar aqui, o caractere é desconhecido
      throw new TypeError(`Caractere inesperado encontrado: "${caractere}" na posição ${atual}`);
    }

    // Adicionar token indicando o fim do código
    tokens.push({ tipo: Palavras_Reservadas.EOF, valor: null });
    console.log(tokens); //LOG PARA DEIXAR VISUAL
    return tokens;
  }
}