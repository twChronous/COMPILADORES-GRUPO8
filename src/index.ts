// Este arquivo simula a utilização do compilador 

import MyCompiler from "./Compiler";

const comp = new MyCompiler();

(async () => {
  await comp.initializeLoaders()
  //console.log(comp.analyzers) // Pelo LOG vemos que os analisadores foram devidamente carregados 
  const lex = comp.analyzers.find(element => element.name == "Lexico") // Busca pelo analizador lexico
  console.log(lex.run()) // executa função "run" definida em "/src/analyzers/Lexycal.analyzer.ts"
})();