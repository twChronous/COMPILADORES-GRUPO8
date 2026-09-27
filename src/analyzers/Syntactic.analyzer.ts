import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface, lexicTokens } from "../utils/types";

let atual = 0;
export default class SyntacticAnalyzer extends AnalyzerModel {
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Sintatico",
        description: "Analise sintática do compilador"
    })
  }

  /**
   * Analise Sintática do compilador
   * 
   * @method run
   * @public
   * @description faz a analise sintática
   * @returns {void}
   */
  public run(): boolean {
    
    return false;
  }

  private espiar(): lexicTokens {
    return this.client.tokens[atual]
  } 
  private consumir(tipoEsperado: String) {
    const token = this.client.tokens[atual];
    if (token.tipo === tipoEsperado) {
      atual++;
      return token;
    }
    throw new SyntaxError(`Erro de Sintaxe: Esperado ${tipoEsperado}, mas encontrou ${token.tipo}`);
  }
}