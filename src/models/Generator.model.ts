import { GeneratorModelOptions, ClientInterface } from "../utils/types";

/**
 * Classe base para definição e gerenciamento de geradores na aplicação
 * 
 * @class GeneratorModel
 * @description Fornece uma estrutura padrão para criação e configuração de geradores
 */
export default class GeneratorModel {
    /** 
     * Instância do cliente com recursos e utilitários do sistema
     * @type {ClientInterface}
     */
    public client: ClientInterface;

    /** 
     * Nome identificador do gerador
     * @type {string}
     */
    public name: string;

    /** 
     * Descrição detalhada da funcionalidade do gerador
     * @type {string}
     */
    public description: string;

    /**
     * Construtor da classe RoutesModel
     * 
     * @param {ClientInterface} client - Instância do cliente com recursos do sistema
     * @param {GeneratorModelOptions} options - Opções de configuração do gerador
     * @param {string} [options.name="Sem Nome"] - Nome do gerador (padrão: "Sem Nome")
     * @param {string} [options.description="Nenhuma"] - Descrição do gerador (padrão: "Nenhuma")
     */
    constructor(
        client: ClientInterface, 
        { 
            name = "Sem Nome", 
            description = "Nenhuma" 
        }: GeneratorModelOptions
    ) {
        // Inicializa as propriedades da classe com os valores fornecidos
        this.client = client;
        this.name = name;
        this.description = description;
    }
  
    /**
     * Método para execução/configuração do gerador
     * 
     * @description 
     * - Método abstrato que deve ser sobrescrito por classes filhas
     * - Responsável por definir a lógica específica de cada gerador
     * 
     * @returns {void}
     */
    public run({...args}): void {
        // Método base vazio, deve ser implementado pelas classes derivadas
        // Cada gerador específico irá sobrescrever este método com sua própria lógica
    }
}