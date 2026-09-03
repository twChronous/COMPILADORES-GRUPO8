// Este arquivo simula a utilização do compilador 

import MyCompiler from "./Compiler";

const comp = new MyCompiler();

//Interface de entrada em construção
export interface argsProps {
  input: String
}

(async () => {
  const args: argsProps = {
    input: "let x = 10 + 20"
  }
  await comp.initializeLoaders()
  //console.log(comp.analyzers) // Pelo LOG vemos que os analisadores foram devidamente carregados 
  const lex = comp.analyzers.find(element => element.name == "Lexico") // Busca pelo analizador lexico
  console.log(lex.run(args)) // executa função "run" definida em "/src/analyzers/Lexycal.analyzer.ts"
})();