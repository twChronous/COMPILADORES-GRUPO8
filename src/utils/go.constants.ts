import { NoLiteral, TipoSemantico } from "./types";

/**
 * Tabela de precedência dos operadores binários suportados pela AST.
 */
export const PRECEDENCIA_OPERADORES: Record<string, number> = {
  "=": 1,
  "+=": 1,
  "-=": 1,
  "||": 2,
  "&&": 3,
  "==": 4,
  "!=": 4,
  ">": 5,
  "<": 5,
  ">=": 5,
  "<=": 5,
  "+": 6,
  "-": 6,
  "*": 7,
  "/": 7,
  "%": 7,
};

/**
 * Operadores binários não associativos à direita que exigem parênteses
 * quando aninhados do lado direito com igual precedência.
 */
export const OPERADORES_NAO_ASSOCIATIVOS_DIREITA: ReadonlySet<string> = new Set([
  "-",
  "/",
  "%",
]);

/**
 * Mapeamento direto dos tipos semânticos primitivos do JavaScript para Go.
 */
export const MAPA_TIPOS_GO: Partial<Record<TipoSemantico, string>> = {
  number: "float64",
  string: "string",
  boolean: "bool",
};

/**
 * Mapeamento direto de `tipoDado` de um nó literal da AST para `TipoSemantico`.
 */
export const MAPA_TIPO_LITERAL: Record<NoLiteral["tipoDado"], TipoSemantico> = {
  NUMERO: "number",
  STRING: "string",
  BOOLEAN: "boolean",
  NULL: "null",
  UNDEFINED: "undefined",
};

/**
 * Mapeamento de chamadas nativas JavaScript para equivalentes da biblioteca padrão Go.
 */
export const MAPA_NATIVOS_GO: Record<string, { chamada: string; pacote: string }> = {
  "console.log": { chamada: "fmt.Println", pacote: "fmt" },
};
