import { describe, expect, test } from "bun:test";
import SyntacticAnalyzer from "./Syntactic.analyzer";
import LexAnalyzer from "./Lexycal.analyzer";
import type { ClientInterface } from "../utils/types";

function analisarCodigo(input: string) {
  const client: ClientInterface = {
    tokens: [],
    analyzers: [],
    LOG() {},
    LOG_ERR() {},
    LOG_WARN() {},
    Error() {},
  };

  const lexer = new LexAnalyzer(client);
  lexer.run({ input });

  const parser = new SyntacticAnalyzer(client);
  const sucesso = parser.run();

  return { ast: client.ast, erros: client.errosSintaticos, sucesso };
}

describe("SyntacticAnalyzer", () => {
  test("deve gerar uma AST para declaração de variáveis (let, const, var)", () => {
    const { ast, sucesso, erros } = analisarCodigo("let x = 10; const y = 20; var z = 30;");

    expect(sucesso).toBe(true);
    expect(erros).toHaveLength(0);
    expect(ast).toHaveLength(3);
    
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoVariavel",
      modificador: "let",
      nome: "x",
      valorInicial: { tipo: "Literal", valor: "10" }
    });

    expect(ast?.[1]).toMatchObject({
      tipo: "DeclaracaoVariavel",
      modificador: "const",
      nome: "y",
      valorInicial: { tipo: "Literal", valor: "20" }
    });
  });

  test("deve respeitar a precedência matemática (multiplicação antes da adição)", () => {
    const { ast, sucesso } = analisarCodigo("resultado = 2 + 3 * 4;");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "ExpressaoStatement",
      expressao: {
        tipo: "ExpressaoBinaria",
        operador: "=",
        esquerda: { tipo: "Identificador", nome: "resultado" },
        direita: {
          tipo: "ExpressaoBinaria",
          operador: "+",
          esquerda: { tipo: "Literal", valor: "2" },
          direita: {
            tipo: "ExpressaoBinaria",
            operador: "*",
            esquerda: { tipo: "Literal", valor: "3" },
            direita: { tipo: "Literal", valor: "4" }
          }
        }
      }
    });
  });

  test("deve forçar a precedência quando usar parênteses", () => {
    const { ast, sucesso } = analisarCodigo("resultado = (2 + 3) * 4;");

    expect(sucesso).toBe(true);
    // O nó à direita do '=' deve ser o '*' com a soma '+' à sua esquerda
    expect(ast?.[0]).toMatchObject({
      tipo: "ExpressaoStatement",
      expressao: {
        tipo: "ExpressaoBinaria",
        operador: "=",
        direita: {
          tipo: "ExpressaoBinaria",
          operador: "*",
          esquerda: {
            tipo: "ExpressaoBinaria",
            operador: "+"
          },
          direita: { tipo: "Literal", valor: "4" }
        }
      }
    });
  });

  test("deve processar estrutura condicional if/else corretamente", () => {
    const { ast, sucesso } = analisarCodigo("if (x > 5) { y = 1; } else { y = 0; }");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoIf",
      condicao: {
        tipo: "ExpressaoBinaria",
        operador: ">",
        esquerda: { tipo: "Identificador", nome: "x" },
        direita: { tipo: "Literal", valor: "5" }
      },
      consequencia: {
        tipo: "Bloco",
        corpo: [
          { tipo: "ExpressaoStatement", expressao: { operador: "=" } }
        ]
      },
      alternativa: {
        tipo: "Bloco",
        corpo: [
          { tipo: "ExpressaoStatement", expressao: { operador: "=" } }
        ]
      }
    });
  });

  test("deve processar declarações sem ponto e vírgula (Opcional)", () => {
    const { ast, sucesso } = analisarCodigo("let x = 10 \n let y = 20");

    expect(sucesso).toBe(true);
    expect(ast).toHaveLength(2);
    expect(ast?.[0].tipo).toBe("DeclaracaoVariavel");
    expect(ast?.[1].tipo).toBe("DeclaracaoVariavel");
  });

  test("Panic Mode: deve recuperar-se de um erro de sintaxe e continuar a análise", () => {
    // A primeira instrução tem um erro (faltando valor após o '='), a segunda é válida
    const { ast, sucesso, erros } = analisarCodigo("let falho = ; let correto = 10;");

    // A análise global deve ser false devido aos erros acumulados
    expect(sucesso).toBe(false);
    
    // O array de erros deve conter o registro do erro da primeira linha
    expect(erros?.length).toBeGreaterThan(0);
    expect(erros?.[0]).toMatch(/Erro de Sintaxe/);

    // No entanto, a AST deve conter o nó da segunda linha porque o Panic Mode recuperou o estado
    expect(ast).toHaveLength(1);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoVariavel",
      nome: "correto",
      valorInicial: { tipo: "Literal", valor: "10" }
    });
  });
});