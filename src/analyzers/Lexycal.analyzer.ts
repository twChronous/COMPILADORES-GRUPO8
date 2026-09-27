import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, TokensType, argsProps, lexicTokens } from "../utils/types";
import { PALAVRAS_CHAVE, Palavras_Reservadas } from "../utils/wordlist";

export default class LexAnalyzer extends AnalyzerModel {
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Lexico",
        description: "Analise Léxica do compilador, devolve faz a tokenização da entrada"
    })
  }

  /**
   * Analise Léxica do compilador
   * 
   * @method run
   * @public
   * @description Faz a analise lexica
   * @returns {boolean}
   */
  public run(args: argsProps): boolean {
    const tokens = this.tokenize(String(args.input));
    this.client.tokens = tokens;
    return true;
  }

  /**
   * Analise Léxica do compilador
   *
   * @method tokenize
   * @public
   * @description Faz a analise lexica em si
   * @returns {Array<lexicTokens>}
   */
  public tokenize(entrada: string): Array<lexicTokens> {
    let atual = 0;
    const tokens: lexicTokens[] = [];

    while (atual < entrada.length) {
      let caractere = entrada[atual];

      // 1. Ignorar espaços em branco
      if (/\s/.test(caractere)) {
        atual++;
        continue;
      }

      // 2. Reconhecer Delimitadores de Escopo e Pontuação
      if (/[{}();,.]/.test(caractere)) {
        tokens.push({ tipo: Palavras_Reservadas.DELIMITADOR as TokensType, valor: caractere });
        atual++;
        continue;
      }

      // 3. Reconhecer Strings ("" ou '')
      if (caractere === '"' || caractere === "'") { 
        let tipoAspas = caractere;
        let valor = '';
        atual++; 
        
        while (atual < entrada.length && entrada[atual] !== tipoAspas) {
          valor += entrada[atual];
          atual++;
        }
        atual++; 
        tokens.push({ tipo: Palavras_Reservadas.STRING as TokensType, valor });
        continue;
      }


      // 4. Reconhecer Números (reconhece decimais)
      if (/[0-9]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[0-9.]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }
        tokens.push({ tipo: Palavras_Reservadas.NUMERO as TokensType, valor });
        continue;
      }

      // 5. Reconhecer Identificadores, Booleanos, Palavras-Chave
      if (/[a-zA-Z_]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[a-zA-Z0-9_]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }

          const valorNormalizado = valor.toLowerCase();
            if (PALAVRAS_CHAVE[valorNormalizado]) {
              if (valorNormalizado === 'true' || valorNormalizado === 'false') {
                tokens.push({ tipo: Palavras_Reservadas.BOOLEAN as TokensType, valor: valorNormalizado });
              } else {
                // Salva a KEYWORD (ex: 'LET', 'IF')
                tokens.push({ tipo: Palavras_Reservadas.KEYWORD as TokensType, valor: PALAVRAS_CHAVE[valorNormalizado] });
              }
            } else {
              // Se for uma variável, mantemos o Case original (ex: 'meuValor' não vira 'meuvalor')
              tokens.push({ tipo: Palavras_Reservadas.IDENTIFICADOR as TokensType, valor });
            }
            continue;
          }

     // 6. Reconhecer Operadores amplos 
      if (/[+\-*/%=<>!&|]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[+\-*/%=<>!&|]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }
        
        if (valor === '===') valor = '=='; 
        
        tokens.push({ tipo: Palavras_Reservadas.OPERADOR as TokensType, valor });
        continue;
      }

      // Se chegar aqui, o caractere é desconhecido
      throw new TypeError(`Caractere inesperado encontrado: "${caractere}" na posição ${atual}`);
    }

    // Adicionar token indicando o fim do código
    tokens.push({ tipo: Palavras_Reservadas.EOF as TokensType, valor: 'EOF' });
    return tokens;
  }
}
