import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface } from "../utils/types";

export default class SemanticalAnalyzer extends AnalyzerModel {
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Semantico",
        description: "Analise semantica do compilador"
    })
  }

  /**
   * Analise Semantica do compilador
   * 
   * @method run
   * @public
   * @description faz a analise semantica
   * @returns {void}
   */
  public run(): boolean {
    
    return false;
  }
}