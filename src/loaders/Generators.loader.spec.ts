import { describe, expect, test } from "bun:test";
import GoGenerator from "../generators/go.generator";
import InferenciaTiposGo from "../generators/go.inference";
import GeneratorModel from "../models/Generator.model";
import { ClientInterface } from "../utils/types";
import GeneratorLoader from "./Generators.loader";

function criarClienteMock(): { client: ClientInterface; erros: string[] } {
  const erros: string[] = [];
  const client: ClientInterface = {
    tokens: [],
    analyzers: [],
    generators: [],
    LOG: () => {},
    LOG_WARN: () => {},
    LOG_ERR: (...args: string[]) => {
      erros.push(args.join(" "));
    },
    Error: (err: any) => {
      throw new Error(String(err));
    },
  };
  return { client, erros };
}

describe("GeneratorLoader (#70)", () => {
  test("carrega apenas instâncias de GeneratorModel com name e output válidos do registro padrão", async () => {
    const { client, erros } = criarClienteMock();
    const loader = new GeneratorLoader(client);

    const resultado = await loader.load();

    expect(resultado.failedGenerators).toEqual([]);
    expect(resultado.totalGenerators).toBe(client.generators!.length);
    expect(client.generators!.length).toBeGreaterThan(0);

    for (const gerador of client.generators!) {
      expect(gerador).toBeInstanceOf(GeneratorModel);
      expect(gerador).not.toBeInstanceOf(InferenciaTiposGo);
      expect(typeof gerador.name).toBe("string");
      expect(gerador.name.length).toBeGreaterThan(0);
      expect(typeof gerador.output).toBe("string");
      expect(gerador.output.length).toBeGreaterThan(0);
    }

    expect(erros).toEqual([]);
  });

  test("rejeita classes que não estendem GeneratorModel como InferenciaTiposGo", async () => {
    const { client, erros } = criarClienteMock();
    const loader = new GeneratorLoader(client);

    const resultado = await loader.load([GoGenerator, InferenciaTiposGo]);

    expect(resultado.totalGenerators).toBe(1);
    expect(resultado.failedGenerators).toEqual(["InferenciaTiposGo"]);
    expect(client.generators).toHaveLength(1);
    expect(client.generators![0]).toBeInstanceOf(GoGenerator);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain("InferenciaTiposGo");
  });
});
