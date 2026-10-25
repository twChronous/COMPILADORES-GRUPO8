import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, TokensType, argsProps, lexicTokens } from "../utils/types";
import { PALAVRAS_CHAVE, Palavras_Reservadas } from "../utils/wordlist";

/**
 * Executa a análise léxica do compilador.
 * Esta classe converte o código-fonte em texto para uma lista de tokens estruturados.
 */
export default class LexAnalyzer extends AnalyzerModel {
  /**
   * Inicializa o analisador léxico.
   * 
   * @param compiler O cliente do compilador que gerencia a aplicação.
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Lexico",
        description: "Executa a análise léxica do compilador. Este processo realiza a tokenização da entrada."
    });
  }

  /**
   * Inicia o processo de análise léxica.
   * 
   * @param args Os argumentos que contêm o texto de entrada.
   * @returns Retorna `true` quando a operação termina com sucesso.
   */
  public run(args: argsProps): boolean {
    const tokens = this.tokenize(String(args.input));
    this.client.tokens = tokens;
    return true;
  }

  /**
   * Converte a string de entrada em uma matriz de tokens.
   * O método lê a string caractere por caractere e rastreia a linha e a coluna.
   * 
   * @param entrada O código-fonte em formato de texto.
   * @returns Uma lista de tokens léxicos com suas posições exatas.
   */
  public tokenize(entrada: string): Array<lexicTokens> {
    let atual = 0;
    let linha = 1;
    let coluna = 1;
    const tokens: lexicTokens[] = [];

    /**
     * Avança o cursor de leitura em uma posição.
     * A função atualiza os contadores de linha e coluna automaticamente.
     */
    const avancar = () => {
      if (atual >= entrada.length) return;
      if (entrada[atual] === '\n') {
        linha++;
        coluna = 1;
      } else {
        coluna++;
      }
      atual++;
    };

    while (atual < entrada.length) {
      let caractere = entrada[atual];
      
      // Armazena a posição inicial do token atual.
      const tokenLinha = linha;
      const tokenColuna = coluna;

      // 1. Ignora os espaços em branco e quebras de linha.
      if (/\s/.test(caractere)) {
        avancar();
        continue;
      }

      // 2. Identifica os delimitadores e pontuações.
      if (/[{}();,.]/.test(caractere)) {
        tokens.push({ 
          tipo: Palavras_Reservadas.DELIMITADOR as TokensType, 
          valor: caractere, 
          linha: tokenLinha, 
          coluna: tokenColuna 
        });
        avancar();
        continue;
      }

      // 3. Identifica as cadeias de texto (Strings).
      if (caractere === '"' || caractere === "'") { 
        let tipoAspas = caractere;
        let valor = '';
        avancar(); // Consome a aspa de abertura.
        
        while (atual < entrada.length && entrada[atual] !== tipoAspas) {
          valor += entrada[atual];
          avancar();
        }
        
        avancar(); // Consome a aspa de fechamento.
        tokens.push({ 
          tipo: Palavras_Reservadas.STRING as TokensType, 
          valor, 
          linha: tokenLinha, 
          coluna: tokenColuna 
        });
        continue;
      }

      // 4. Identifica os números. O método aceita valores decimais.
      if (/[0-9]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[0-9.]/.test(entrada[atual])) {
          valor += entrada[atual];
          avancar();
        }
        tokens.push({ 
          tipo: Palavras_Reservadas.NUMERO as TokensType, 
          valor, 
          linha: tokenLinha, 
          coluna: tokenColuna 
        });
        continue;
      }

      // 5. Identifica os identificadores, valores booleanos e palavras-chave.
      if (/[a-zA-Z_]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[a-zA-Z0-9_]/.test(entrada[atual])) {
          valor += entrada[atual];
          avancar();
        }

        const valorNormalizado = valor.toLowerCase();
        
        if (PALAVRAS_CHAVE[valorNormalizado]) {
          if (valorNormalizado === 'true' || valorNormalizado === 'false') {
            tokens.push({ 
              tipo: Palavras_Reservadas.BOOLEAN as TokensType, 
              valor: valorNormalizado, 
              linha: tokenLinha, 
              coluna: tokenColuna 
            });
          } else {
            // Registra a palavra-chave (ex: 'LET', 'IF').
            tokens.push({ 
              tipo: Palavras_Reservadas.KEYWORD as TokensType, 
              valor: PALAVRAS_CHAVE[valorNormalizado], 
              linha: tokenLinha, 
              coluna: tokenColuna 
            });
          }
        } else {
          // Registra a variável e mantém a capitalização original (Case Sensitive).
          tokens.push({ 
            tipo: Palavras_Reservadas.IDENTIFICADOR as TokensType, 
            valor, 
            linha: tokenLinha, 
            coluna: tokenColuna 
          });
        }
        continue;
      }

      // 6. Identifica os operadores lógicos e matemáticos.
      if (/[+\-*/%=<>!&|]/.test(caractere)) {
        let valor = '';
        while (atual < entrada.length && /[+\-*/%=<>!&|]/.test(entrada[atual])) {
          valor += entrada[atual];
          avancar();
        }
        
        // Padroniza a igualdade estrita para igualdade simples no escopo deste compilador.
        if (valor === '===') valor = '=='; 
        
        tokens.push({ 
          tipo: Palavras_Reservadas.OPERADOR as TokensType, 
          valor, 
          linha: tokenLinha, 
          coluna: tokenColuna 
        });
        continue;
      }

      // Se o fluxo chegar aqui, o caractere é inválido para a linguagem.
      throw new TypeError(`Caractere inesperado encontrado: "${caractere}" na linha ${tokenLinha}, coluna ${tokenColuna}`);
    }

    // Registra o token final de arquivo.
    tokens.push({ 
      tipo: Palavras_Reservadas.EOF as TokensType, 
      valor: 'EOF', 
      linha, 
      coluna 
    });
    
    return tokens;
  }
}