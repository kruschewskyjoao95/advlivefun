import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.postgresClient ??
  postgres(
    connectionString ??
      "postgres://jurisadv:jurisadv@localhost:55432/jurisadv",
    {
      prepare: false,
      max: 10,
    },
  );

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client);
