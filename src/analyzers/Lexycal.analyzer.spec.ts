import { describe, expect, test } from "bun:test";
import LexAnalyzer from "./Lexycal.analyzer";
import type { ClientInterface } from "../utils/types";

const mockClient: ClientInterface = {
  tokens: [],
  analyzers: [],
  LOG() {},
  LOG_ERR() {},
  LOG_WARN() {},
  Error() {},
};

// Função auxiliar para simplificar os testes e evitar repetição de 'linha' e 'coluna'
function obterTokensLimpos(input: string) {
  const analyzer = new LexAnalyzer(mockClient);
  return analyzer.tokenize(input).map(t => ({ tipo: t.tipo, valor: t.valor }));
}

describe("LexAnalyzer", () => {
  test("tokenize: a = 1 + 2 produz a lista completa de tokens", () => {
    const tokens = obterTokensLimpos("a = 1 + 2");

    expect(tokens).toEqual([
      { tipo: "IDENTIFICADOR", valor: "a" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "1" },
      { tipo: "OPERADOR", valor: "+" },
      { tipo: "NUMERO", valor: "2" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: caractere inválido lança TypeError indicando linha e coluna", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(() => analyzer.tokenize("@")).toThrow(TypeError);
    expect(() => analyzer.tokenize("@")).toThrow(
      'Caractere inesperado encontrado: "@" na linha 1, coluna 1'
    );
  });

  test("tokenize: reconhece todas as palavras-chave corretamente", () => {
    const tokens = obterTokensLimpos("let const var function if else while for return");

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "LET" },
      { tipo: "KEYWORD", valor: "CONST" },
      { tipo: "KEYWORD", valor: "VAR" },
      { tipo: "KEYWORD", valor: "FUNCTION" },
      { tipo: "KEYWORD", valor: "IF" },
      { tipo: "KEYWORD", valor: "ELSE" },
      { tipo: "KEYWORD", valor: "WHILE" },
      { tipo: "KEYWORD", valor: "FOR" },
      { tipo: "KEYWORD", valor: "RETURN" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece identificadores, incluindo com underline e dígitos", () => {
    const tokens = obterTokensLimpos("x foo _bar baz123 _123abc");

    expect(tokens).toEqual([
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "IDENTIFICADOR", valor: "foo" },
      { tipo: "IDENTIFICADOR", valor: "_bar" },
      { tipo: "IDENTIFICADOR", valor: "baz123" },
      { tipo: "IDENTIFICADOR", valor: "_123abc" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece números inteiros e decimais", () => {
    const tokens = obterTokensLimpos("42 3.14 0 007");

    expect(tokens).toEqual([
      { tipo: "NUMERO", valor: "42" },
      { tipo: "NUMERO", valor: "3.14" },
      { tipo: "NUMERO", valor: "0" },
      { tipo: "NUMERO", valor: "007" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece strings com aspas duplas e com aspas simples", () => {
    expect(obterTokensLimpos('"ola mundo"')).toEqual([
      { tipo: "STRING", valor: "ola mundo" },
      { tipo: "EOF", valor: "EOF" },
    ]);

    expect(obterTokensLimpos("'ola'")).toEqual([
      { tipo: "STRING", valor: "ola" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece string vazia", () => {
    const tokens = obterTokensLimpos('""');

    expect(tokens).toEqual([
      { tipo: "STRING", valor: "" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece booleanos true e false", () => {
    const tokens = obterTokensLimpos("true false");

    expect(tokens).toEqual([
      { tipo: "BOOLEAN", valor: "true" },
      { tipo: "BOOLEAN", valor: "false" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece operadores aritméticos, de atribuição, relacionais e lógicos", () => {
    const tokens = obterTokensLimpos("+ - * / % = == != < > <= >= && ||");

    expect(tokens).toEqual([
      { tipo: "OPERADOR", valor: "+" },
      { tipo: "OPERADOR", valor: "-" },
      { tipo: "OPERADOR", valor: "*" },
      { tipo: "OPERADOR", valor: "/" },
      { tipo: "OPERADOR", valor: "%" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "OPERADOR", valor: "==" },
      { tipo: "OPERADOR", valor: "!=" },
      { tipo: "OPERADOR", valor: "<" },
      { tipo: "OPERADOR", valor: ">" },
      { tipo: "OPERADOR", valor: "<=" },
      { tipo: "OPERADOR", valor: ">=" },
      { tipo: "OPERADOR", valor: "&&" },
      { tipo: "OPERADOR", valor: "||" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: normaliza o operador === para ==", () => {
    const tokens = obterTokensLimpos("a === b");

    expect(tokens).toEqual([
      { tipo: "IDENTIFICADOR", valor: "a" },
      { tipo: "OPERADOR", valor: "==" },
      { tipo: "IDENTIFICADOR", valor: "b" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece delimitadores de escopo e pontuação", () => {
    const tokens = obterTokensLimpos("{ } ( ) ; , .");

    expect(tokens).toEqual([
      { tipo: "DELIMITADOR", valor: "{" },
      { tipo: "DELIMITADOR", valor: "}" },
      { tipo: "DELIMITADOR", valor: "(" },
      { tipo: "DELIMITADOR", valor: ")" },
      { tipo: "DELIMITADOR", valor: ";" },
      { tipo: "DELIMITADOR", valor: "," },
      { tipo: "DELIMITADOR", valor: "." },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: ignora espaços, tabulações e quebras de linha", () => {
    const tokens = obterTokensLimpos("let\t x\n =  \n 5");

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "LET" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "5" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: entrada vazia ou só com espaços gera apenas o token EOF", () => {
    expect(obterTokensLimpos("")).toEqual([{ tipo: "EOF", valor: "EOF" }]);
    expect(obterTokensLimpos("   \t\n  ")).toEqual([{ tipo: "EOF", valor: "EOF" }]);
  });

  test("tokenize: um programa completo produz a sequência correta de tokens", () => {
    const tokens = obterTokensLimpos("let x = 10; if (x > 5) { return true; }");

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "LET" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "10" },
      { tipo: "DELIMITADOR", valor: ";" },
      { tipo: "KEYWORD", valor: "IF" },
      { tipo: "DELIMITADOR", valor: "(" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: ">" },
      { tipo: "NUMERO", valor: "5" },
      { tipo: "DELIMITADOR", valor: ")" },
      { tipo: "DELIMITADOR", valor: "{" },
      { tipo: "KEYWORD", valor: "RETURN" },
      { tipo: "BOOLEAN", valor: "true" },
      { tipo: "DELIMITADOR", valor: ";" },
      { tipo: "DELIMITADOR", valor: "}" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: caractere inválido no meio da entrada reporta a linha e coluna corretas", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(() => analyzer.tokenize("a = @ + 1")).toThrow(TypeError);
    expect(() => analyzer.tokenize("a = @ + 1")).toThrow(
      'Caractere inesperado encontrado: "@" na linha 1, coluna 5'
    );
  });
});