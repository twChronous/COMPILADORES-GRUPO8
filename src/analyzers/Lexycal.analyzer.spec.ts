import { describe, expect, test } from "bun:test";
import LexAnalyzer from "./Lexycal.analyzer";
import type { ClientInterface } from "../utils/types";

const mockClient: ClientInterface = {
  analyzers: [],
  LOG() {},
  LOG_ERR() {},
  LOG_WARN() {},
  Error() {},
};

describe("LexAnalyzer", () => {
  test("tokenize: a = 1 + 2 produz a lista completa de tokens", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("a = 1 + 2");

    expect(tokens).toEqual([
      { tipo: "IDENTIFICADOR", valor: "a" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "1" },
      { tipo: "OPERADOR", valor: "+" },
      { tipo: "NUMERO", valor: "2" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: caractere inválido lança TypeError", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(() => analyzer.tokenize("@")).toThrow(TypeError);
    expect(() => analyzer.tokenize("@")).toThrow(
      'Caractere inesperado encontrado: "@" na posição 0'
    );
  });

  test("tokenize: reconhece todas as palavras-chave com o subtipo correto", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize(
      "let const var function if else while for return"
    );

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "let", subtipo: "LET" },
      { tipo: "KEYWORD", valor: "const", subtipo: "CONST" },
      { tipo: "KEYWORD", valor: "var", subtipo: "VAR" },
      { tipo: "KEYWORD", valor: "function", subtipo: "FUNCTION" },
      { tipo: "KEYWORD", valor: "if", subtipo: "IF" },
      { tipo: "KEYWORD", valor: "else", subtipo: "ELSE" },
      { tipo: "KEYWORD", valor: "while", subtipo: "WHILE" },
      { tipo: "KEYWORD", valor: "for", subtipo: "FOR" },
      { tipo: "KEYWORD", valor: "return", subtipo: "RETURN" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece identificadores, incluindo com underline e dígitos", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("x foo _bar baz123 _123abc");

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
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("42 3.14 0 007");

    expect(tokens).toEqual([
      { tipo: "NUMERO", valor: "42" },
      { tipo: "NUMERO", valor: "3.14" },
      { tipo: "NUMERO", valor: "0" },
      { tipo: "NUMERO", valor: "007" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece strings com aspas duplas e com aspas simples", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(analyzer.tokenize('"ola mundo"')).toEqual([
      { tipo: "STRING", valor: "ola mundo" },
      { tipo: "EOF", valor: "EOF" },
    ]);

    expect(analyzer.tokenize("'ola'")).toEqual([
      { tipo: "STRING", valor: "ola" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece string vazia", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize('""');

    expect(tokens).toEqual([
      { tipo: "STRING", valor: "" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece booleanos true e false", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("true false");

    expect(tokens).toEqual([
      { tipo: "BOOLEAN", valor: "true" },
      { tipo: "BOOLEAN", valor: "false" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece operadores aritméticos, de atribuição, relacionais e lógicos", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize(
      "+ - * / % = == != < > <= >= && ||"
    );

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
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("a === b");

    expect(tokens).toEqual([
      { tipo: "IDENTIFICADOR", valor: "a" },
      { tipo: "OPERADOR", valor: "==" },
      { tipo: "IDENTIFICADOR", valor: "b" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: reconhece delimitadores de escopo e pontuação", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("{ } ( ) ; , .");

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
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize("let\t x\n =  \n 5");

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "let", subtipo: "LET" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "5" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: entrada vazia ou só com espaços gera apenas o token EOF", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(analyzer.tokenize("")).toEqual([{ tipo: "EOF", valor: "EOF" }]);
    expect(analyzer.tokenize("   \t\n  ")).toEqual([
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: um programa completo produz a sequência correta de tokens", () => {
    const analyzer = new LexAnalyzer(mockClient);
    const tokens = analyzer.tokenize(
      "let x = 10; if (x > 5) { return true; }"
    );

    expect(tokens).toEqual([
      { tipo: "KEYWORD", valor: "let", subtipo: "LET" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: "=" },
      { tipo: "NUMERO", valor: "10" },
      { tipo: "DELIMITADOR", valor: ";" },
      { tipo: "KEYWORD", valor: "if", subtipo: "IF" },
      { tipo: "DELIMITADOR", valor: "(" },
      { tipo: "IDENTIFICADOR", valor: "x" },
      { tipo: "OPERADOR", valor: ">" },
      { tipo: "NUMERO", valor: "5" },
      { tipo: "DELIMITADOR", valor: ")" },
      { tipo: "DELIMITADOR", valor: "{" },
      { tipo: "KEYWORD", valor: "return", subtipo: "RETURN" },
      { tipo: "BOOLEAN", valor: "true" },
      { tipo: "DELIMITADOR", valor: ";" },
      { tipo: "DELIMITADOR", valor: "}" },
      { tipo: "EOF", valor: "EOF" },
    ]);
  });

  test("tokenize: caractere inválido no meio da entrada reporta a posição correta", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(() => analyzer.tokenize("a = @ + 1")).toThrow(TypeError);
    expect(() => analyzer.tokenize("a = @ + 1")).toThrow(
      'Caractere inesperado encontrado: "@" na posição 4'
    );
  });
});