import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const projectFile = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("fonte única da Etapa 0", () => {
  test("publica os quatro ADRs e seus pontos de entrada", async () => {
    const [readme, roadmap, ...adrs] = await Promise.all([
      projectFile("README.md"),
      projectFile("ROADMAP.md"),
      projectFile("docs/adr/0001-identity-roles-and-authorization.md"),
      projectFile("docs/adr/0002-publication-consent-and-retention.md"),
      projectFile("docs/adr/0003-contact-reservation-and-subscription.md"),
      projectFile("docs/adr/0004-conversations-moderation-and-retention.md"),
    ]);

    expect(readme).toContain("ROADMAP.md");
    expect(readme).toContain("COMPLIANCE.md");
    expect(readme).toContain("docs/adr");
    expect(roadmap).toContain("Etapa 0");
    expect(adrs).toHaveLength(4);
    expect(adrs.map((adr) => /Estado: proposto/.test(adr))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  test("declara o fechamento documental sem afirmar produto ou Stripe prontos", async () => {
    const [readme, roadmap, compliance] = await Promise.all([
      projectFile("README.md"),
      projectFile("ROADMAP.md"),
      projectFile("COMPLIANCE.md"),
    ]);

    expect(readme).toMatch(/Etapa 0.*conclu/i);
    expect(readme).toMatch(/não.*(?:checkout|cobrança) real/i);
    expect(roadmap).toMatch(/Etapa 0.*conclu/i);
    expect(compliance).toContain("dois advogados verificados");
    expect(compliance).toContain("honorários");
    expect(compliance).toContain("casos reais");
  });
});
