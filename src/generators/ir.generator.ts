import GeneratorModel from "../models/Generator.model";
import { ClientInterface } from "../utils/types";

/**
 * Gera o codigo intermediario(ir).
 * Esta classe converte as saidas dos analizadores.
 */
export default class IrGenerator extends GeneratorModel {
  /**
   * Inicializa o gerador de codigo intermediario.
   * 
   * @param compiler O cliente do compilador que gerencia a aplicação.
   */
  constructor(compiler: ClientInterface) {
    super(compiler, {
        name: "Generator",
        output: "ir",
        description: "Gera o codigo intermediario"
    });
  }

  /**
   * Inicia o processo de geração.
   * 
   * @param args Os argumentos que contêm o texto de entrada.
   * @returns Retorna `true` quando a operação termina com sucesso.
   */
  public run(): boolean {

    return true;
  }
}