import { describe, expect, test } from "bun:test";
import {
  assertPlatformCharge,
  validateInformativeProfile,
} from "./compliance";

describe("compliance de publicidade", () => {
  test("aceita informação profissional sóbria", () => {
    expect(
      validateInformativeProfile(
        "Advogada inscrita na OAB, com atuação em direito contratual.",
      ),
    ).toEqual({ approved: true, violations: [] });
  });

  test("rejeita promessa e apelo mercadológico", () => {
    expect(
      validateInformativeProfile(
        "Garantimos resultado com desconto. Contrate agora.",
      ),
    ).toEqual({
      approved: false,
      violations: ["O texto contém linguagem promocional ou promessa vedada."],
    });
  });
});

describe("separação financeira", () => {
  test("aceita assinatura da plataforma", () => {
    expect(() => assertPlatformCharge("platform_subscription")).not.toThrow();
  });

  test("bloqueia cobrança de honorários", () => {
    expect(() => assertPlatformCharge("legal_fees")).toThrow(
      "não pode cobrar, reter ou repassar honorários",
    );
  });
});
