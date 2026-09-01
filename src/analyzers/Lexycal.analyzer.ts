import AnalyzerModel from "../models/Analyzer.model";
import { ClientInterface } from "../utils/types";

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
   * @description Registra rotas para diferentes operações de autenticação
   * @returns {void}
   */
  public run(): boolean {
    
    return true;
  }
}