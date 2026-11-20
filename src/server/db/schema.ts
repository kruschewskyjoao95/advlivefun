import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profileType = pgEnum("profile_type", ["client", "lawyer"]);

export const earlyAccessRegistrations = pgTable(
  "early_access_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    profileType: profileType("profile_type").notNull(),
    privacyConsentVersion: text("privacy_consent_version").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);
