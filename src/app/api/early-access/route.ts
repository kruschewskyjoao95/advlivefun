import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { earlyAccessRegistrations } from "@/server/db/schema";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  profileType: z.enum(["client", "lawyer"]),
  privacyConsent: z.literal("on"),
  website: z.string().max(0).optional(),
});

type Registration = z.infer<typeof registrationSchema>;
type Register = (registration: Registration) => Promise<void>;

async function persistRegistration(registration: Registration) {
  await db
    .insert(earlyAccessRegistrations)
    .values({
      name: registration.name,
      email: registration.email.toLowerCase(),
      profileType: registration.profileType,
      privacyConsentVersion: "early-access-v1",
    })
    .onConflictDoNothing();
}

export async function handleEarlyAccessRequest(
  request: Request,
  register: Register = persistRegistration,
) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json(
      { message: "Envie os dados em formato válido." },
      { status: 400 },
    );
  }

  const parsed = registrationSchema.safeParse(input);

  if (!parsed.success) {
    return Response.json(
      {
        message:
          "Revise o formulário e aceite o tratamento descrito na política de privacidade.",
      },
      { status: 422 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return Response.json(
      {
        message:
          "O cadastro ainda não está conectado ao banco. Volte em breve.",
      },
      { status: 503 },
    );
  }

  try {
    await register(parsed.data);
  } catch {
    console.error("early_access.registration_failed", {
      correlationId: randomUUID(),
    });
    return Response.json(
      { message: "Não foi possível concluir o cadastro agora." },
      { status: 500 },
    );
  }

  return Response.json(
    { message: "Interesse registrado. Entraremos em contato sobre o acesso." },
    { status: 201 },
  );
}

export function POST(request: Request) {
  return handleEarlyAccessRequest(request);
}
