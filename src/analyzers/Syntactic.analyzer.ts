import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface } from "../utils/types";

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
}