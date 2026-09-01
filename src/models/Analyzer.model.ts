import { AnalyzerModelOptions, ClientInterface } from "../utils/types";

/**
 * Classe base para definição e gerenciamento de analizadores na aplicação
 * 
 * @class AnalyzerModel
 * @description Fornece uma estrutura padrão para criação e configuração de analizadores
 */
export default class AnalyzerModel {
    /** 
     * Instância do cliente com recursos e utilitários do sistema
     * @type {ClientInterface}
     */
    public client: ClientInterface;

    /** 
     * Nome identificador da rota
     * @type {string}
     */
    public name: string;

    /** 
     * Descrição detalhada da funcionalidade da rota
     * @type {string}
     */
    public description: string;

    /**
     * Construtor da classe RoutesModel
     * 
     * @param {ClientInterface} client - Instância do cliente com recursos do sistema
     * @param {AnalyzerModelOptions} options - Opções de configuração da rota
     * @param {string} [options.name="Sem Nome"] - Nome da rota (padrão: "Sem Nome")
     * @param {string} [options.description="Nenhuma"] - Descrição da rota (padrão: "Nenhuma")
     */
    constructor(
        client: ClientInterface, 
        { 
            name = "Sem Nome", 
            description = "Nenhuma" 
        }: AnalyzerModelOptions
    ) {
        // Inicializa as propriedades da classe com os valores fornecidos
        this.client = client;
        this.name = name;
        this.description = description;
    }
  
    /**
     * Método para execução/configuração da rota
     * 
     * @description 
     * - Método abstrato que deve ser sobrescrito por classes filhas
     * - Responsável por definir a lógica específica de cada rota
     * 
     * @returns {void}
     */
    public run(): void {
        // Método base vazio, deve ser implementado pelas classes derivadas
        // Cada rota específica irá sobrescrever este método com sua própria lógica
    }
}