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

  test("for: deve reconhecer a forma clássica com declaração, condição e atualização", () => {
    const { ast, sucesso, erros } = analisarCodigo("for (let i = 0; i < 3; i += 1) { x = i; }");

    expect(sucesso).toBe(true);
    expect(erros).toHaveLength(0);
    expect(ast).toHaveLength(1);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFor",
      inicializacao: {
        tipo: "DeclaracaoVariavel",
        modificador: "let",
        nome: "i",
        valorInicial: { tipo: "Literal", valor: "0" }
      },
      condicao: {
        tipo: "ExpressaoBinaria",
        operador: "<",
        esquerda: { tipo: "Identificador", nome: "i" },
        direita: { tipo: "Literal", valor: "3" }
      },
      atualizacao: {
        tipo: "ExpressaoBinaria",
        operador: "+=",
        esquerda: { tipo: "Identificador", nome: "i" },
        direita: { tipo: "Literal", valor: "1" }
      },
      corpo: {
        tipo: "Bloco",
        corpo: [{ tipo: "ExpressaoStatement" }]
      }
    });
  });

  test("for: inicialização pode ser uma expressão de atribuição", () => {
    const { ast, sucesso } = analisarCodigo("for (i = 0; i < 3; i += 1) { }");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFor",
      inicializacao: { tipo: "ExpressaoStatement", expressao: { operador: "=" } }
    });
  });

  test("for: as três partes podem ser omitidas (for (;;))", () => {
    const { ast, sucesso } = analisarCodigo("for (;;) { break; }");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFor",
      inicializacao: null,
      condicao: null,
      atualizacao: null,
      corpo: { corpo: [{ tipo: "BreakStatement" }] }
    });
  });

  test("for: falta de ';' após a inicialização gera erro de sintaxe", () => {
    const { sucesso, erros } = analisarCodigo("for (let i = 0 i < 3; i += 1) { }");

    expect(sucesso).toBe(false);
    expect(erros?.[0]).toMatch(/Erro de Sintaxe/);
  });

  test("for: falta de ')' gera erro de sintaxe", () => {
    const { sucesso, erros } = analisarCodigo("for (let i = 0; i < 3; i += 1 { }");

    expect(sucesso).toBe(false);
    expect(erros?.[0]).toMatch(/Esperado '\)'/);
  });

  test("for: sem bloco '{' gera erro de sintaxe", () => {
    const { sucesso, erros } = analisarCodigo("for (let i = 0; i < 3; i += 1) x = 1;");

    expect(sucesso).toBe(false);
    expect(erros?.[0]).toMatch(/Esperado '\{'/);
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
    test("precedência: && fica na raiz de 'a >= 0 && b != 3'", () => {
    const { ast, sucesso } = analisarCodigo("a >= 0 && b != 3;");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "ExpressaoStatement",
      expressao: {
        operador: "&&",
        esquerda: { operador: ">=" },
        direita: { operador: "!=" }
      }
    });
  });

  test("precedência: && liga mais forte que || (a || b && c)", () => {
    const { ast } = analisarCodigo("a || b && c;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: "||",
        esquerda: { tipo: "Identificador", nome: "a" },
        direita: { operador: "&&" }
      }
    });
  });

  test("precedência: a && b || c agrupa o && à esquerda", () => {
    const { ast } = analisarCodigo("a && b || c;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: "||",
        esquerda: { operador: "&&" },
        direita: { tipo: "Identificador", nome: "c" }
      }
    });
  });

  test("precedência: relacional liga mais forte que igualdade (a == b < c)", () => {
    const { ast } = analisarCodigo("a == b < c;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: "==",
        esquerda: { nome: "a" },
        direita: { operador: "<" }
      }
    });
  });

  test("precedência: aritmética liga mais forte que relacional (a + 1 > b)", () => {
    const { ast } = analisarCodigo("a + 1 > b;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: ">",
        esquerda: { operador: "+" },
        direita: { nome: "b" }
      }
    });
  });

  test("associatividade à esquerda: a && b && c", () => {
    const { ast } = analisarCodigo("a && b && c;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: "&&",
        esquerda: { operador: "&&" },
        direita: { nome: "c" }
      }
    });
  });

  test("parênteses sobrescrevem a precedência: (a || b) && c", () => {
    const { ast } = analisarCodigo("(a || b) && c;");

    expect(ast?.[0]).toMatchObject({
      expressao: {
        operador: "&&",
        esquerda: { operador: "||" },
        direita: { nome: "c" }
      }
    });
  });

  test("while: condição com && e != gera a AST correta", () => {
    const { ast, sucesso } = analisarCodigo("while (a >= 0 && b != 3) { a -= 1; }");

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoWhile",
      condicao: {
        operador: "&&",
        esquerda: { operador: ">=" },
        direita: { operador: "!=" }
      }
    });
  });
   //teste_Paulo
  test("deve reconhecer função sem parâmetros", () => {
    const { ast, sucesso, erros } =
      analisarCodigo("function teste() {}");

    expect(sucesso).toBe(true);
    expect(erros).toHaveLength(0);

    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFuncao",
      nome: "teste",
      parametros: [],
      corpo: {
        tipo: "Bloco",
        corpo: []
      }
    });
  });

  test("deve reconhecer função com múltiplos parâmetros e retorno", () => {
    const { ast, sucesso } = analisarCodigo(
      "function soma(a, b) { return a + b; }"
    );

    expect(sucesso).toBe(true);

    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFuncao",
      nome: "soma",
      parametros: [
        { tipo: "Parametro", nome: "a" },
        { tipo: "Parametro", nome: "b" }
      ],
      corpo: {
        tipo: "Bloco",
        corpo: [
          {
            tipo: "ReturnStatement",
            argumento: {
              tipo: "ExpressaoBinaria",
              operador: "+",
              esquerda: {
                tipo: "Identificador",
                nome: "a"
              },
              direita: {
                tipo: "Identificador",
                nome: "b"
              }
            }
          }
        ]
      }
    });
  });

  test("deve reconhecer return sem expressão", () => {
    const { ast, sucesso } = analisarCodigo(
      "function sair() { return; }"
    );

    expect(sucesso).toBe(true);
    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFuncao",
      corpo: {
        corpo: [
          {
            tipo: "ReturnStatement",
            argumento: null
          }
        ]
      }
    });
  });

  test("deve reconhecer retorno dentro de if", () => {
    const { ast, sucesso } = analisarCodigo(
      "function positivo(x) { if (x > 0) { return true; } return false; }"
    );

    expect(sucesso).toBe(true);

    expect(ast?.[0]).toMatchObject({
      tipo: "DeclaracaoFuncao",
      corpo: {
        corpo: [
          { tipo: "DeclaracaoIf" },
          {
            tipo: "ReturnStatement",
            argumento: {
              tipo: "Literal",
              valor: "false"
            }
          }
        ]
      }
    });
  });

  test("deve rejeitar parâmetro inválido na função", () => {
    const { sucesso, erros } = analisarCodigo(
      "function soma(123) { return 1; }"
    );

    expect(sucesso).toBe(false);
    expect(erros?.length).toBeGreaterThan(0);
    expect(erros?.[0]).toMatch(/Erro de Sintaxe/);
  });

});