import { afterEach, describe, expect, test } from "bun:test";
import { handleEarlyAccessRequest, POST } from "./route";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("POST /api/early-access", () => {
  test("responde 400 quando o corpo não é JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/early-access", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Envie os dados em formato válido.",
    });
  });

  test("responde 422 quando falta consentimento", async () => {
    const response = await POST(
      new Request("http://localhost/api/early-access", {
        method: "POST",
        body: JSON.stringify({
          name: "Pessoa Exemplo",
          email: "pessoa@example.com",
          profileType: "client",
          website: "",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message:
        "Revise o formulário e aceite o tratamento descrito na política de privacidade.",
    });
  });

  test("responde 503 quando o banco ainda não está configurado", async () => {
    delete process.env.DATABASE_URL;
    const response = await POST(
      new Request("http://localhost/api/early-access", {
        method: "POST",
        body: JSON.stringify({
          name: "Pessoa Exemplo",
          email: "pessoa@example.com",
          profileType: "client",
          privacyConsent: "on",
          website: "",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: "O cadastro ainda não está conectado ao banco. Volte em breve.",
    });
  });

  test("não registra dados pessoais quando a persistência falha", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const name = "Pessoa Exemplo";
    const email = "pessoa@example.com";
    const logged: unknown[][] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    try {
      const response = await handleEarlyAccessRequest(
        new Request("http://localhost/api/early-access", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            profileType: "client",
            privacyConsent: "on",
            website: "",
          }),
        }),
        async () => {
          throw new Error(
            `insert failed for name=${name} email=${email} with query parameters`,
          );
        },
      );
      const responseBody = await response.text();
      const logOutput = JSON.stringify(logged);

      expect(response.status).toBe(500);
      expect(responseBody).not.toContain(name);
      expect(responseBody).not.toContain(email);
      expect(logOutput).not.toContain(name);
      expect(logOutput).not.toContain(email);
      expect(logged).toHaveLength(1);
      expect(logged[0]?.[0]).toBe("early_access.registration_failed");
      expect(logged[0]?.[1]).toEqual({
        correlationId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        ),
      });
    } finally {
      console.error = originalError;
    }
  });
});
