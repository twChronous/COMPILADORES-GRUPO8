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
      { tipo: "ATRIBUICAO", valor: "=" },
      { tipo: "NUMERO", valor: "1" },
      { tipo: "SOMA", valor: "+" },
      { tipo: "NUMERO", valor: "2" },
      { tipo: "EOF", valor: null },
    ]);
  });

  test("tokenize: caractere inválido lança TypeError", () => {
    const analyzer = new LexAnalyzer(mockClient);

    expect(() => analyzer.tokenize("@")).toThrow(TypeError);
    expect(() => analyzer.tokenize("@")).toThrow(
      'Caractere inesperado encontrado: "@" na posição 0'
    );
  });
});
