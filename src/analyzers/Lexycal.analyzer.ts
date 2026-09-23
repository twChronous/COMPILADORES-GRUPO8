import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, argsProps } from "../utils/types";

const Palavras_Reservadas = {
  NUMERO: 'NUMERO',
  STRING: 'STRING',
  BOOLEAN: 'BOOLEAN',
  IDENTIFICADOR: 'IDENTIFICADOR',
  KEYWORD: 'KEYWORD',
  OPERADOR: 'OPERADOR', // aritméticos, atribuição, relacionais e lógicos
  DELIMITADOR: 'DELIMITADOR', // delimitadores de escopo []
  EOF: 'EOF'              // Fim do arquivo (End of File)
};

const PALAVRAS_CHAVE: Record<string, string> = {
  'let': 'LET',      
  'const': 'CONST',          
  'var': 'VAR', 
  'function': 'FUNCTION',
  'if': 'IF',
  'else': 'ELSE',
  'while': 'WHILE',
  'for': 'FOR',
  'return': 'RETURN',
  'true': 'TRUE',
  'false': 'FALSE'
};

interface analisarLexicoOut {
  tipo: string,
  valor: string,
  subtipo?: string;
}
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

    /**
   * Analise Léxica do compilador
   * 
   * @method analisarLexico
   * @public
   * @description Faz a analise lexica em si
   * @returns {Array<analisarLexicoOut>}
   */

  private analisarLexico(entrada:String): Array<analisarLexicoOut> {
    let atual = 0;
    const tokens = [];

    while (atual < entrada.length) {
      let caractere = entrada[atual];

      // 1. Ignorar espaços em branco
      if (/\s/.test(caractere)) {
        atual++;
        continue;
      }

      // 2. Reconhecer Delimitadores de Escopo e Pontuação
      if (/[{}();,.]/.test(caractere)) {
        tokens.push({ tipo: Palavras_Reservadas.DELIMITADOR, valor: caractere });
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
        tokens.push({ tipo: Palavras_Reservadas.STRING, valor });
        continue;
      }


      // 4. Reconhecer Números (reconhece decimais)
      if (/[0-9]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[0-9.]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }
        tokens.push({ tipo: Palavras_Reservadas.NUMERO, valor });
        continue;
      }

      // 5. Reconhecer Identificadores, Booleanos, Palavras-Chave
      if (/[a-zA-Z_]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[a-zA-Z0-9_]/.test(entrada[atual])) {
          valor += entrada[atual];
          atual++;
        }

      if (PALAVRAS_CHAVE[valor]) {
        if (valor === 'true' || valor === 'false') {
            tokens.push({ tipo: Palavras_Reservadas.BOOLEAN, valor });
        } else {
            tokens.push({ tipo: Palavras_Reservadas.KEYWORD, valor, subtipo: PALAVRAS_CHAVE[valor] });
        }
      } else {
        tokens.push({ tipo: Palavras_Reservadas.IDENTIFICADOR, valor });
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
        
        tokens.push({ tipo: Palavras_Reservadas.OPERADOR, valor });
        continue;
      }

      // Se chegar aqui, o caractere é desconhecido
      throw new TypeError(`Caractere inesperado encontrado: "${caractere}" na posição ${atual}`);
    }

    // Adicionar token indicando o fim do código
    tokens.push({ tipo: Palavras_Reservadas.EOF, valor: 'EOF' });
    console.log(tokens); //LOG PARA DEIXAR VISUAL
    return tokens;
  }
}
