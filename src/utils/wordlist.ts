export const Palavras_Reservadas = {
  NUMERO: 'NUMERO',
  STRING: 'STRING',
  BOOLEAN: 'BOOLEAN',
  IDENTIFICADOR: 'IDENTIFICADOR',
  KEYWORD: 'KEYWORD',
  OPERADOR: 'OPERADOR', // aritméticos, atribuição, relacionais e lógicos
  DELIMITADOR: 'DELIMITADOR', // delimitadores de escopo []
  EOF: 'EOF'              // Fim do arquivo (End of File)
};

export const PALAVRAS_CHAVE: Record<string, string> = {
  'let': 'LET',      
  'const': 'CONST',          
  'var': 'VAR', 
  'function': 'FUNCTION',
  'if': 'IF',
  'else': 'ELSE',
  'while': 'WHILE',
  'for': 'FOR',
  'return': 'RETURN',
  'true': 'TRUE',
  'false': 'FALSE'
};