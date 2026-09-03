import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface } from "../utils/types";

export default class SemanticalAnalyzer extends AnalyzerModel {
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Semantico",
        description: "Analise Léxica do compilador"
    })
  }

  /**
   * Analise Semantica do compilador
   * 
   * @method run
   * @public
   * @description Registra rotas para diferentes operações de autenticação
   * @returns {void}
   */
  public run(): boolean {
    
    return false;
  }
}